#!/bin/bash

cd ../.. || exit

echo "delete node_modules folder"
rm -rvf node_modules

echo "delete package-lock.json"
rm -rvf package-lock.json

echo "delete cdk.out folder"
rm -rvf cdk.out

echo "clean npm cache"
npm cache clean --force
