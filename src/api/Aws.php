<?php

// Percolate LMS
//
// Copyright (C) 2018 Michaels & Associates Docntrain, Ltd.
//
// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of  MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.
//

namespace Lms;


class Aws{
	private static $sdkClient = null;

	public static function getClient(){
		if(self::$sdkClient) return self::$sdkClient;

		$SECRET_AWS_ACCESS_KEY_ID = Conf::read('aws_access_key_id');
		$SECRET_AWS_SECRET_ACCESS_KEY = Conf::read('aws_access_key');
		$AWS_DEFAULT_REGION = Conf::read('aws_default_region');
		$AWS_SES_REGION = Conf::read('aws_ses_region');


		self::$sdkClient = new \Aws\Sdk([
			'version' => 'latest',
			'region'  => $AWS_DEFAULT_REGION,
			'Ses' => [
				'region' => $AWS_SES_REGION,
			],
			'credentials' => [
				'key'    => $SECRET_AWS_ACCESS_KEY_ID,
				'secret' => $SECRET_AWS_SECRET_ACCESS_KEY,
			],
		]);
		return self::$sdkClient;
	}

	public static function getS3Client(){
		return self::getClient()->createS3();
	}

	public static function getSesClient(){
		return self::getClient()->createSes();
	}

	public static function sesSendEmail($to, $subject, $body){
		$EMAIL_FROM = Conf::read('email_from');
		$ses = self::getSesClient();
		$ses->sendEmail([
			'Source' => $EMAIL_FROM,
			'Destination' => [ 
				'ToAddresses' => [ $to ],
			],
			'Message' => [
				'Subject' => [
					'Data' => $subject,
				],
				'Body' => [
					'Text' => [
						'Data' => $body,
					],
				],
			],
		]);
	}


	public static function s3MakeContentKey($fid, $fname = null){
		// note: fname is optional because we might also want to make a 
		// subkey for a whole "directory" of files (scorm content, for example)

		$tid = Tenants::getTenantId();

		// strip any querystrings which might be present
		if($fname) $fname = preg_replace('/\?.*/', '', $fname);
		
		return "tenant{$tid}/files/{$fid}" . ($fname ? "/$fname" : "");
	}

	public static function s3Upload($fid, $local_file, $dest_fname){
		$LMS_S3_BUCKET = Conf::read('aws_s3_bucket');
		$s3 = self::getS3Client();
		// Upload an object by streaming the contents of a file
		// $pathToFile should be absolute path to a file on disk
		$key = self::s3MakeContentKey($fid, $dest_fname);

		// http://docs.aws.amazon.com/AmazonS3/latest/dev/LLuploadFilePHP.html

		// Create a new multipart upload and get the upload ID.
		$response = $s3->createMultipartUpload(array(
		    'Bucket' => $LMS_S3_BUCKET,
		    'Key'    => $key
		));
		$uploadId = $response['UploadId'];

		// Upload the file in parts.
		$file = fopen($local_file, 'r');
		$parts = array();
		$partNumber = 1;
		while (!feof($file)) {
		    $result = $s3->uploadPart(array(
			'Bucket'     => $LMS_S3_BUCKET,
			'Key'        => $key,
			'UploadId'   => $uploadId,
			'PartNumber' => $partNumber,
			'Body'       => fread($file, 5 * 1024 * 1024),
		    ));
		    $parts[] = array(
			'PartNumber' => $partNumber++,
			'ETag'       => $result['ETag'],
		    );
		}

		// Complete multipart upload.
		$result = $s3->completeMultipartUpload(array(
		    'Bucket'   => $LMS_S3_BUCKET,
		    'Key'      => $key,
		    'UploadId' => $uploadId,
                    // http://stackoverflow.com/a/31413193/695615
		    'MultipartUpload' => [
		    	'Parts'    => $parts,
		    ],
		));
		$url = $result['Location'];

		fclose($file);

                return $result;
	}

	public static function s3UploadDir($fid, $local_dir){
		$LMS_S3_BUCKET = Conf::read('aws_s3_bucket');
		$s3 = self::getS3Client();
		$bucket = $LMS_S3_BUCKET;

		$key = self::s3MakeContentKey($fid);

		$s3->uploadDirectory($local_dir, $bucket, $key);
	}



	public static function s3ServeFile($fid, $fname){
		// returns:
		//		true if this function will handle the response
		// 		false if the calling resource needs to return an error

		$LMS_S3_BUCKET = Conf::read('aws_s3_bucket');

		$bucket = $LMS_S3_BUCKET;
		
		$key = self::s3MakeContentKey($fid, $fname);

		$s3 = self::getS3Client();
		$s3->registerStreamWrapper(); // allows us to use readfile() below
		$options = array('Bucket' => $bucket, 'Key' => $key);

		//Log::info("Aws::s3ServeFile() options: ". json_encode($options));

		if (isset($_SERVER['HTTP_IF_NONE_MATCH'])) {
			$options['IfNoneMatch'] = $_SERVER['HTTP_IF_NONE_MATCH'];
		}
		if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
			$options['IfModifiedSince'] = $_SERVER['HTTP_IF_MODIFIED_SINCE'];
		}


		// get the object
		try{
			$head_data = $s3->headObject($options);
		}
		catch(\Aws\S3\Exception\S3Exception $e){
			Log::warn("Aws::s3ServeFile() could not find ".$e->getMessage().", options: ".json_encode($options));
			http_response_code(404);
			exit;
		}

		$statusCode = $head_data["@metadata"]["statusCode"];
		http_response_code($statusCode);

		// if we won't be delivering a file, exit here
		if($statusCode !== 200) exit;

		// proxy the headers from s3

		foreach([
			'Content-Length',
			'Last-Modified',
			'Content-Type',
			'ETag',
			'Content-Disposition',
			'Content-Encoding',
		] as $header){
			$s3_param = $head_data[str_replace('-', '', $header)];
			// don't override headers we've *already* set (example: stylesheet)
			if($s3_param && !header_sent($header)){
				header("{$header}: {$s3_param}");
			}
		}

		// flush buffers, make sure we don't buffer the readfile() call below...
		if (ob_get_level()) { ob_end_flush(); }
		flush();

		// send the file!
		readfile("s3://{$bucket}/{$key}");

		exit;
	}
}


// https://php.net/manual/en/function.headers-list.php#109395
function header_sent($header) {
    $headers = headers_list();
    $header = trim($header,': ');
    $result = false;
    foreach ($headers as $hdr) {
        if (stripos($hdr, $header) !== false) {
            $result = true;
        }
    }
    return $result;
}
