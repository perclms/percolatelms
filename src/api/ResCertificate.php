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

class ResCertificate extends \HummingJay\Resource{ 
	public $title = "Completion certificate for content";
	public $description = "A person's completion certificate for a particular piece of content";

	public function GET($server){
		$person_id = $server->params['person_id'];
		$content_id = $server->params['content_id'];

		$db = Db::from('crecord_v', ['person_id'=>$person_id, 'content_id'=>$content_id]);
		$record = $db->fetch();


		// will extract desired data from record, write out pdf, and exit
		$this->print_cert($record);
	}


	private function print_cert($record){
		// FPDF already does this:
		//header('Content-type: application/pdf');
		ob_get_clean();

		$name = $record['name'];
		$title = $record['title'];
		$date = date("j F Y", strtotime($record['completed_ts']));
		$completed = $record['completed'];
		$score = $record['score'];

		$pdf = new \FPDF();
		#define('FPDF_FONTPATH', '/tmp/pdf');
		#$pdf->SetFont('Quicksand_Book.otf');
		#$pdf->SetFontSize(39);
		$pdf->AddPage('L');

		$name_text = "39"; // pt
		$course_text = "36"; // pt
		$date_text = "29"; // pt
		$filler_text = "24"; // pt

		// Certificate of Completion
		$pdf->SetFont('Times', '', 59);
		$pdf->SetX(100);
		$pdf->SetY(9);
		$pdf->SetTextColor(99);
		$pdf->Cell(0,35,'Certificate of Completion', 1, 1, 'C');
		$pdf->SetTextColor(0);

		// This certifies that NAME
		$pdf->Cell(0,10, '', 0, 1, 'C');
		$pdf->SetFont('Times', '', $filler_text);
		$pdf->Cell(0,15,'This Certifies That', 0, 1, 'C');
		$pdf->SetFont('Arial', 'U', $name_text);
		$pdf->Cell(0,25,$name, 0, 1, 'C');

		if ($completed){
			// Successfully completed COURSE TITLE
			$pdf->SetFont('Times', '', $filler_text);
			$pdf->Cell(0,15,'Successfully Completed', 0, 1, 'C');
			$pdf->SetFont('Arial', 'U', $course_text);
			$pdf->Cell(0,30,$title, 0, 1, 'C');

			// on DATE
			$pdf->SetFont('Times', '', $filler_text);
			$pdf->Cell(0,10,'on', 0, 1, 'C');
			$pdf->SetFont('Arial', 'I', $date_text);
			$pdf->Cell(0,20,$date, 0, 1, 'C');

			if (is_numeric($score)) {
				// (with optional) SCORE
				$pdf->SetFont('Times', '', $filler_text);
				$pdf->Cell(0,10,$score, 0, 1, 'C');
			}
		}
		else {
			// Might have seen COURSE TITLE
			$pdf->SetFont('Times', '', $filler_text);
			$pdf->Cell(0,15,'Might have seen', 0, 1, 'C');
			$pdf->SetFont('Arial', 'U', $course_text);
			$pdf->Cell(0,30,$title, 0, 1, 'C');
		}

		$pdf->Output('certificate.pdf', 'I');
	}
}
