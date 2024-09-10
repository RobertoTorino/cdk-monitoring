#!/bin/sh

# Required: alarm name:
aws cloudwatch set-alarm-state --alarm-name "alarm-name" --state-value OK --state-reason "testing purposes"
