#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { addTags, env, Environment, } from '../lib/shared';
import { SqsMonitoringStack } from '../lib/monitoring-sqs-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { LambdaMonitoringStack } from '../lib/monitoring-lambda-stack';


const app = new cdk.App();

const monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
    description: 'Monitoring stack for the SNS and Chatbot resources.',
    env,
});
addTags(monitoringStack, Environment.prod);

const lambdaMonitoringStack = new LambdaMonitoringStack(app, 'LambdaMonitoringStack', {
    description: 'Monitoring stack for the Lambda functions.',
    env,
});
addTags(lambdaMonitoringStack, Environment.prod);

const sqsMonitoringStack = new SqsMonitoringStack(app, 'SqsStack', {
    description: 'Monitoring sqs stack.',
    env,
});
addTags(sqsMonitoringStack, Environment.prod);

app.synth();
