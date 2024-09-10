import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue as SQSQeueue } from "aws-cdk-lib/aws-sqs";
import { Topic } from 'aws-cdk-lib/aws-sns';
import { chatBotNotificationTopic } from './shared';
import SqsMonitoringConstruct from './sqs-construct';


export class SqsMonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const monitoringTopic = Topic.fromTopicArn(this, 'SubscriptionTopic', chatBotNotificationTopic);

        const sqsQueue01 = SQSQeueue.fromQueueArn(this, 'ImportedQueue01', 'arn:aws:sqs:eu-west-1:0123456789:sqs-queue');

        const oldestMessageAlarmNames = [
            'Oldest-Message',
        ];

        const messagesNotVisibleAlarmNames = [
            'NotVisible-Message',
        ];

        const messagesVisibleAlarmNames = [
            'Visible-Message',
        ];

        const messagesSentAlarmNames = [
            'Sent-CS-Message',
        ];

        new SqsMonitoringConstruct(this, 'SqsQueues', {
            dashboardName: 'SQS-Monitoring-Dashboard',
            snsTopic: monitoringTopic,
            sqsQueues: [
                sqsQueue01,
            ],
            oldestMessageAlarmNames,
            messagesNotVisibleAlarmNames,
            messagesVisibleAlarmNames,
            messagesSentAlarmNames,
            customLabels: [
                'SqsMessage',
            ],
        });
    }
}
