<?php
// create a JPEG-like background
$bg = imagecreatetruecolor(800, 800);
$red = imagecolorallocate($bg, 255, 0, 0);
imagefilledrectangle($bg, 0, 0, 800, 800, $red);

// create a png with transparent background and a blue square
$png = imagecreatetruecolor(400, 400);
imagealphablending($png, false);
imagesavealpha($png, true);
$trans = imagecolorallocatealpha($png, 0, 0, 0, 127);
imagefill($png, 0, 0, $trans);
$blue = imagecolorallocate($png, 0, 0, 255);
imagefilledrectangle($png, 100, 100, 300, 300, $blue);

// process
$targetWidth = 200;
$targetHeight = 200;
$tempCanvas = imagecreatetruecolor($targetWidth, $targetHeight);
imagealphablending($tempCanvas, false);
imagesavealpha($tempCanvas, true);
$trans2 = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127);
imagefilledrectangle($tempCanvas, 0, 0, $targetWidth, $targetHeight, $trans2);
imagecopyresampled($tempCanvas, $png, 0, 0, 0, 0, $targetWidth, $targetHeight, 400, 400);

imagealphablending($bg, true);
// TEST 1: imagecopy
$bg1 = imagecreatetruecolor(800, 800);
imagefilledrectangle($bg1, 0, 0, 800, 800, $red);
imagealphablending($bg1, true);
imagecopy($bg1, $tempCanvas, 100, 100, 0, 0, 200, 200);
imagejpeg($bg1, 'test1.jpg');

// TEST 2: imagecopyresampled without temp canvas
$bg2 = imagecreatetruecolor(800, 800);
imagefilledrectangle($bg2, 0, 0, 800, 800, $red);
imagealphablending($bg2, true);
imagecopyresampled($bg2, $png, 100, 100, 0, 0, 200, 200, 400, 400);
imagejpeg($bg2, 'test2.jpg');

// TEST 3: imagecopyresampled with temp canvas (using imagecopyresampled to blend)
$bg3 = imagecreatetruecolor(800, 800);
imagefilledrectangle($bg3, 0, 0, 800, 800, $red);
imagealphablending($bg3, true);
imagecopyresampled($bg3, $tempCanvas, 100, 100, 0, 0, 200, 200, 200, 200);
imagejpeg($bg3, 'test3.jpg');

echo "Done test\n";
