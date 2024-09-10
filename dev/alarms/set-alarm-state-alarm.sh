#!/bin/sh

# Required: alarm name:
aws cloudwatch set-alarm-state --alarm-name "alarm-name" --state-value ALARM --state-reason "testing purposes"

