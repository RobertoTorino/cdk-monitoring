import { Construct } from 'constructs'
import { AlarmRule, AlarmState, AlarmStatusWidget, ComparisonOperator, CompositeAlarm, Dashboard, GraphWidget, LegendPosition, TextWidget, TreatMissingData, } from 'aws-cdk-lib/aws-cloudwatch'
import { ITopic, } from 'aws-cdk-lib/aws-sns'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import { Duration } from 'aws-cdk-lib';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { markdownSlackChannelSqsText } from './shared';


interface SqsMonitoringProps {
    sqsQueues: Array<IQueue>;
    snsTopic: ITopic;
    dashboardName: string;
    oldestMessageAlarmNames: string[];
    messagesNotVisibleAlarmNames: string[];
    messagesVisibleAlarmNames: string[];
    messagesSentAlarmNames: string[];
    customLabels?: string[];
}

export default class SqsMonitoringConstruct extends Construct {
    public readonly dashboard: Dashboard
    public readonly snsTopic: ITopic

    constructor(scope: Construct, id: string, props: SqsMonitoringProps) {
        super(scope, id);

        this.dashboard = new Dashboard(this, 'SqsDashboard', {
            dashboardName: props.dashboardName,
            start: '-PT3H',
        });

        this.snsTopic = props.snsTopic;

        this.addSqsWidgets({
            sqsQueues: props.sqsQueues,
            oldestMessageAlarmNames: props.oldestMessageAlarmNames,
            messagesNotVisibleAlarmNames: props.messagesNotVisibleAlarmNames,
            messagesVisibleAlarmNames: props.messagesVisibleAlarmNames,
            messagesSentAlarmNames: props.messagesSentAlarmNames,
            customLabels: props.customLabels || [], // logGroups: props.logGroups,
        });
    }

    subscribeAlarm(alarm: CompositeAlarm) {
        alarm.addAlarmAction(new SnsAction(this.snsTopic))
    }

    addSqsWidgets({
        sqsQueues,
        oldestMessageAlarmNames,
        messagesNotVisibleAlarmNames,
        messagesVisibleAlarmNames,
        messagesSentAlarmNames,
        customLabels, // logGroups,
    }: {
        sqsQueues: Array<IQueue>; oldestMessageAlarmNames: string[]; messagesNotVisibleAlarmNames: string[]; messagesVisibleAlarmNames: string[]; messagesSentAlarmNames: string[]; customLabels: string[];
    }) {
        const oldestMessageMetrics = sqsQueues.map(sq => ({
            sq,
            metric: sq.metricApproximateAgeOfOldestMessage({
                period: Duration.minutes(1),
                statistic: 'max',
            })
        }))

        const messagesNotVisibleMetrics = sqsQueues.map(sq => ({
            sq,
            metric: sq.metricApproximateNumberOfMessagesNotVisible({
                period: Duration.minutes(1),
                statistic: 'avg',
            })
        }))

        const messagesVisibleMetrics = sqsQueues.map(sq => ({
            sq,
            metric: sq.metricApproximateNumberOfMessagesVisible({
                period: Duration.minutes(1),
                statistic: 'avg',
            })
        }))

        const messagesSentMetrics = sqsQueues.map(sq => ({
            sq,
            metric: sq.metricNumberOfMessagesSent({
                period: Duration.minutes(1),
                statistic: 'Sum',
            })
        }))

        const oldestMessageAlarms = oldestMessageMetrics.map((oldestMessageMetric, index) => {
            const oldestMessageAlarmName = `${oldestMessageAlarmNames[index]}`;
            return oldestMessageMetric.metric.createAlarm(this, oldestMessageAlarmNames[index], {
                alarmName: oldestMessageAlarmName,
                alarmDescription: 'Into alarm state when the age of the oldest message in the queue is above 1500 for 15 datapoints within 15 minutes ',
                evaluationPeriods: 15,
                datapointsToAlarm: 15, // The recommended threshold value for this alarm is highly dependent on the expected message processing time.
                // You can use historical data to calculate the average message processing time,
                // and then set the threshold to 50% higher than the maximum expected SQS message processing time by queue consumers.
                // depends on the processing time, here we assume it's 1 second X the max. concurrency (1500).
                threshold: 1500,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            });
        });

        const messagesNotVisibleAlarms = messagesNotVisibleMetrics.map((messagesNotVisibleMetric, index) => {
            const messagesNotVisibleAlarmName = `${messagesNotVisibleAlarmNames[index]}`;
            return messagesNotVisibleMetric.metric.createAlarm(this, messagesNotVisibleAlarmNames[index], {
                alarmName: messagesNotVisibleAlarmName,
                alarmDescription: 'This alarm is used to detect a high number of in-flight messages in the queue. If consumers do not delete messages within the visibility timeout period, when the queue is polled, messages reappear in the queue. For FIFO queues, there can be a maximum of 20,000 in-flight messages. If you reach this quota, SQS returns no error messages. A FIFO queue looks through the first 20k messages to determine available message groups. This means that if you have a backlog of messages in a single message group, you cannot consume messages from other message groups that were sent to the queue at a later time until you successfully consume the messages from the backlog.',
                evaluationPeriods: 15,
                datapointsToAlarm: 15, // The recommended threshold value for this alarm is highly dependent on the expected number of messages in flight.
                // You can use historical data to calculate the maximum expected number of messages in flight and set the threshold to 50% over this value.
                // If consumers of the queue are processing but not deleting messages from the queue, this number will suddenly increase.
                threshold: 1000,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            });
        });

        const messagesVisibleAlarms = messagesVisibleMetrics.map((messagesVisibleMetric, index) => {
            const messagesVisibleAlarmName = `${messagesVisibleAlarmNames[index]}`;
            return messagesVisibleMetric.metric.createAlarm(this, messagesVisibleAlarmNames[index], {
                alarmName: messagesVisibleAlarmName,
                alarmDescription: 'This alarm is used to detect whether the message count of the active queue is too high and consumers are slow to process the messages or there are not enough consumers to process them.',
                evaluationPeriods: 15,
                datapointsToAlarm: 15,
                threshold: 1000,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            });
        });

        const messagesSentAlarms = messagesSentMetrics.map((messagesSentMetric, index) => {
            const messagesSentAlarmName = `${messagesSentAlarmNames[index]}`;
            return messagesSentMetric.metric.createAlarm(this, messagesSentAlarmNames[index], {
                alarmName: messagesSentAlarmName,
                alarmDescription: 'If the number of messages sent is 0, the producer is not sending any messages. If this queue has a low TPS (Transactions Per Second), increase the number of EvaluationPeriods accordingly.',
                evaluationPeriods: 15,
                datapointsToAlarm: 15,
                threshold: 0.0,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
            });
        });

        // Calculate the height of the widget based on the number of queues
        const numSqsQueues = sqsQueues.length;
        const dynamicHeight = Math.max(6, Math.min(24, Math.ceil(numSqsQueues / 2)));

        this.dashboard.addWidgets(new TextWidget({
            width: 24,
            height: 1,
            markdown: markdownSlackChannelSqsText
        }));

        // Composite Alarms
        const oldestMessageCompositeAlarm = new CompositeAlarm(this, 'OldestMessageCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...oldestMessageAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'OldestMessageAlarm',
        });
        this.subscribeAlarm(oldestMessageCompositeAlarm);

        const messagesNotVisibleCompositeAlarm = new CompositeAlarm(this, 'MessagesNotVisibleCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...messagesNotVisibleAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'MessagesNotVisibleAlarm',
        });
        this.subscribeAlarm(messagesNotVisibleCompositeAlarm);

        const messagesVisibleCompositeAlarm = new CompositeAlarm(this, 'MessagesVisibleCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...messagesVisibleAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'MessagesVisibleAlarm',
        });
        this.subscribeAlarm(messagesVisibleCompositeAlarm);

        const messagesSentCompositeAlarm = new CompositeAlarm(this, 'MessagesSentCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...messagesSentAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'MessagesSentAlarm',
        });
        this.subscribeAlarm(messagesSentCompositeAlarm);

        // Add composite alarms as widgets on the dashboard
        this.dashboard.addWidgets(new AlarmStatusWidget({
            alarms: [ oldestMessageCompositeAlarm ],
            width: 5,
            height: 2,
            title: 'Oldest SNS messages.',
        }), new AlarmStatusWidget({
            alarms: [ messagesNotVisibleCompositeAlarm ],
            width: 5,
            height: 2,
            title: 'SNS messages not visible.',
        }), new AlarmStatusWidget({
            alarms: [ messagesVisibleCompositeAlarm ],
            width: 5,
            height: 2,
            title: 'SNS messages visible.',
        }), new AlarmStatusWidget({
            alarms: [ messagesSentCompositeAlarm ],
            width: 5,
            height: 2,
            title: 'Number of SNS messages sent',
        }));

        // Using dynamic labels here
        this.dashboard.addWidgets(new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'ApproximateAgeOfOldestMessage: Max',
            left: sqsQueues.map((sq, index) => sq.metricApproximateAgeOfOldestMessage({
                statistic: 'max',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || sq.queueName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'ApproximateNumberOfMessagesNotVisible: Avg',
            left: sqsQueues.map((sq, index) => sq.metricApproximateNumberOfMessagesNotVisible({
                statistic: 'avg',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || sq.queueName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'ApproximateNumberOfMessagesVisible: Avg',
            left: sqsQueues.map((sq, index) => sq.metricApproximateNumberOfMessagesVisible({
                statistic: 'avg',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || sq.queueName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'NumberOfMessagesSent: Sum',
            left: sqsQueues.map((sq, index) => sq.metricNumberOfMessagesSent({
                statistic: 'Sum',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || sq.queueName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }));

        // The time messages are sent versus when they are ingested.
        //     this.dashboard.addWidgets(new aws_cloudwatch.LogQueryWidget({
        //         title: 'SQS Message Logs',
        //         logGroupNames: logGroups,
        //         width: 24,
        //         height: 12,
        //         view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
        //         queryString: `
        //         fields @ingestionTime, @message, @logStream, event.Records[0].attributes.SentTimestamp,
        //                @ingestionTime - event.Records[0].attributes.SentTimestamp as timestampDifference
        //         | sort timestampDifference desc
        // `,
        //     }));

        return {
            alarms: [
                ...oldestMessageAlarms,
                ...messagesNotVisibleAlarms,
                ...messagesVisibleAlarms,
                ...messagesSentAlarms
            ],
        }
    }
}
