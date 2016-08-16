#!/bin/sh

file='yaoqiang.zip'
dirname='yaoqiang'

# url='localhost:8000/yaoqiang.zip'
# url='https://sourceforge.net/projects/bpmn/files/latest/download'
url='https://sourceforge.net/projects/bpmn/files/4.1-GPLv3/yaoqiang-bpmn-editor-4.1.11.zip/download'

if [ ! -d "$dirname" ]; then
  wget -O $file $url
  rm -r $dirname
  mkdir $dirname
  unzip $file  -d $dirname
  rm $file
  mv $dirname/*/* $dirname/
fi
