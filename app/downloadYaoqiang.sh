#!/bin/sh

file='yaoqiang.zip'
dirname='yaoqiang'

# url='localhost:8000/yaoqiang.zip'
url='https://sourceforge.net/projects/bpmn/files/latest/download'

wget -O $file $url
rm -r $dirname
mkdir $dirname
unzip $file  -d $dirname
rm $file
mv $dirname/*/* $dirname/
