#!/bin/bash

# Test your iac with snyk (optional debug mode = -d)
now=$(date +"%d-%m-%Y-%T")

echo "Remove old test files:"
rm -rvf test/*.html

cd cdk.out || exit

snyk iac test --json | snyk-to-html -d > ../test/snyk-iac-"${now}".html && open ../test/snyk-iac-"${now}".html
