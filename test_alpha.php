<?php
$bg = imagecreatetruecolor(800, 800);
$red = imagecolorallocate($bg, 255, 0, 0);
imagefilledrectangle($bg, 0, 0, 800, 800, $red);

// create a transparent png
$png = imagecreatetruecolor(400, 400);
imagealphablending($png, false);
imagesavealpha($png, true);
$transparent = imagecolorallocatealpha($png, 0, 0, 0, 127);
imagefilledrectangle($png, 0, 0, 400, 400, $transparent);
$blue = imagecolorallocatealpha($png, 0, 0, 255, 0);
imagefilledellipse($png, 200, 200, 200, 200, $blue);
imagepng($png, 'test_trans.png');

$playerImg = imagecreatefrompng('test_trans.png');
// Method 1
$bg1 = imagecreatetruecolor(800, 800);
imagefilledrectangle($bg1, 0, 0, 800, 800, $red);
imagealphablending($bg1, true);
imagecopyresampled($bg1, $playerImg, 100, 100, 0, 0, 200, 200, 400, 400);
imagejpeg($bg1, 'test_out1.jpg');

// Method 2: resize canvas
$bg2 = imagecreatetruecolor(800, 800);
imagefilledrectangle($bg2, 0, 0, 800, 800, $red);

$resized = imagecreatetruecolor(200, 200);
imagealphablending($resized, false);
imagesavealpha($resized, true);
$trans = imagecolorallocatealpha($resized, 0, 0, 0, 127);
imagefilledrectangle($resized, 0, 0, 200, 200, $trans);
imagecopyresampled($resized, $playerImg, 0, 0, 0, 0, 200, 200, 400, 400);

imagealphablending($bg2, true);
imagecopy($bg2, $resized, 100, 100, 0, 0, 200, 200);
imagejpeg($bg2, 'test_out2.jpg');

echo "Done\n";
