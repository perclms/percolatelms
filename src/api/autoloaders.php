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

require __DIR__.'/vendor/autoload.php';
require __DIR__.'/errors.php';


spl_autoload_register(function($class){
	$class_parts = explode('\\', $class);
	$class = array_pop($class_parts);

	$path0 = __DIR__."/{$class}.php";
	if(file_exists($path0)){
		require($path0);
		return true;
	}

	echo "Autoloader Error: Couldn't find class '$class' in $path0\n";

	// first check common
	$path1 = __DIR__."/common/{$class}.php";
	if(file_exists($path1)){
		require($path1);
		return true;
	}

	// then check resources
	$path2 = __DIR__."/resources/{$class}.php";
	if(file_exists($path2)){
		require($path2);
		return true;
	}

	echo "Autoloader Error: Couldn't find class '$class' in $path1 or in $path2\n";

	return false;
});


