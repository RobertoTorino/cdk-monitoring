#!/bin/sh

# all alarms
aws cloudwatch describe-alarms --max-items 10000 --output json > describe_all_alarms.json
jq '[.MetricAlarms[] | select(.AlarmActions[] | contains("Name"))]' describe_all_alarms.json > larms.json
jq '[.MetricAlarms[] | select(.AlarmActions[] | contains("Name")) | {AlarmName}]' describe_all_alarms.json > filtered_names.json
