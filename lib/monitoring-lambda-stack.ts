import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import MonitoringConstruct from './lambda-construct';
import { chatBotNotificationTopic } from './shared';


export class LambdaMonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const monitoringTopic = Topic.fromTopicArn(this, 'SubscriptionTopic', chatBotNotificationTopic);

        const lambdaFunction01 = Function.fromFunctionArn(this, 'ImportedLambdaFunction01', 'arn:aws:lambda:eu-west-1:0123456789:function:lambda-function');

        const throttleAlarmNames = [
            'Throttles-LambdaFunction',
        ];

        const errorAlarmNames = [
            'Errors-LambdaFunction',
        ];

        const durationAlarmNames = [
            'Duration-LambdaFunction',
        ];

        const logGroups = [
            '/aws/lambda/LambdaFunction',
        ];
        new MonitoringConstruct(this, 'LambdaFunctions', {
            dashboardName: 'Lambda-Monitoring-Dashboard',
            snsTopic: monitoringTopic,
            functions: [
                lambdaFunction01,
            ],
            throttleAlarmNames,
            errorAlarmNames,
            durationAlarmNames,
            logGroups,
            customLabels: [
                'LambdaFunction',
            ]
        });
    }
}
