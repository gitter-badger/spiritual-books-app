#!/bin/bash
read -r -p "提交说明信息:" comment
if [ ! $comment ]; then
  git add . && git commit -m "$(date "+%Y-%m-%d %H:%M:%S")" && git push
else
  git add . && git commit -m "$comment" && git push
fi