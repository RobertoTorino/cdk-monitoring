import { Construct } from 'constructs'
import { AlarmRule, AlarmState, AlarmStatusWidget, Color, ComparisonOperator, CompositeAlarm, Dashboard, GraphWidget, LegendPosition, Metric, SingleValueWidget, TableLayout, TableSummaryColumn, TableThreshold, TableWidget, TextWidget, TreatMissingData, } from 'aws-cdk-lib/aws-cloudwatch'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { ITopic, } from 'aws-cdk-lib/aws-sns'
import { aws_cloudwatch, Duration } from 'aws-cdk-lib';
import { markdownCloudwatchText, markdownSlackChannelText } from './shared';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';


interface MonitoringProps {
    functions: Array<IFunction>;
    snsTopic: ITopic;
    dashboardName: string;
    throttleAlarmNames: string[];
    errorAlarmNames: string[];
    durationAlarmNames: string[];
    customLabels?: string[];
    logGroups: string[];
}

export default class MonitoringConstruct extends Construct {
    public readonly dashboard: Dashboard
    public readonly snsTopic: ITopic

    constructor(scope: Construct, id: string, props: MonitoringProps) {
        super(scope, id);

        this.dashboard = new Dashboard(this, 'Dashboard', {
            dashboardName: props.dashboardName,
            start: '-PT3H',
        });

        this.snsTopic = props.snsTopic;

        this.addLambdaWidgets({
            functions: props.functions,
            throttleAlarmNames: props.throttleAlarmNames,
            errorAlarmNames: props.errorAlarmNames,
            durationAlarmNames: props.durationAlarmNames,
            customLabels: props.customLabels || [],
            logGroups: props.logGroups,
        });
    }

    subscribeAlarm(alarm: CompositeAlarm) {
        alarm.addAlarmAction(new SnsAction(this.snsTopic))
    }

    addLambdaWidgets({
        functions,
        throttleAlarmNames,
        errorAlarmNames,
        durationAlarmNames,
        customLabels,
        logGroups,
    }: {
        functions: Array<IFunction>; throttleAlarmNames: string[]; errorAlarmNames: string[]; durationAlarmNames: string[]; customLabels: string[]; logGroups: string[];
    }) {
        const throttleMetrics = functions.map(fn => ({
            fn,
            metric: fn.metricThrottles({
                period: Duration.minutes(1),
                statistic: 'Sum',
            })
        }))

        const errorMetrics = functions.map(fn => ({
            fn,
            metric: fn.metricErrors({
                period: Duration.minutes(1),
                statistic: 'Sum',
            })
        }))

        const durationMetrics = functions.map(fn => ({
            fn,
            metric: fn.metricDuration({
                period: Duration.minutes(1),
                statistic: 'p90',
            })
        }))
        functions.map(fn => ({
            fn,
            metric: fn.metricInvocations({
                period: Duration.minutes(1),
                statistic: 'Sum',
            })
        }))

        const throttleAlarms = throttleMetrics.map((throttleMetric, index) => {
            const customThrottleAlarmName = `${throttleAlarmNames[index]}`;
            return throttleMetric.metric.createAlarm(this, throttleAlarmNames[index], {
                alarmName: customThrottleAlarmName,
                alarmDescription: 'Into alarm state when the number of throttled invocation requests is above 1 for 5 datapoints within 5 minutes.',
                evaluationPeriods: 5,
                datapointsToAlarm: 5,
                threshold: 1,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            });
        });

        const errorAlarms = errorMetrics.map((errorMetric, index) => {
            const customErrorAlarmName = `${errorAlarmNames[index]}`;
            return errorMetric.metric.createAlarm(this, errorAlarmNames[index], {
                alarmName: customErrorAlarmName,
                alarmDescription: 'Into alarm state when the number of errors is above 5 for 3 datapoints within 3 minutes.',
                evaluationPeriods: 3,
                datapointsToAlarm: 3,
                threshold: 5,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            });
        });

        const durationAlarms = durationMetrics.map((durationMetric, index) => {
            const customDurationAlarmName = `${durationAlarmNames[index]}`;
            return durationMetric.metric.createAlarm(this, durationAlarmNames[index], {
                alarmName: customDurationAlarmName,
                alarmDescription: 'Into alarm state when event processing goes above 1000ms for 15 datapoints within 15 minutes.',
                evaluationPeriods: 15,
                datapointsToAlarm: 15,
                threshold: 1000,
                treatMissingData: TreatMissingData.NOT_BREACHING,
                comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            });
        });

        // Calculate the height of the widget based on the number of functions
        const numFunctions = functions.length;
        const dynamicHeight = Math.max(6, Math.min(24, Math.ceil(numFunctions / 2)));
        const tableScalingFactor = 2;
        const tableWidgetHeight = dynamicHeight * tableScalingFactor;

        const claimedAccountConcurrency = new Metric({
            period: Duration.minutes(1),
            namespace: 'AWS/Lambda',
            statistic: 'Max',
            metricName: 'ClaimedAccountConcurrency',
            color: '#00819c',
            label: '[max: ${MAX}] Monitoring the Region Level Availability of Invocations',
        });

        const claimedAccountConcurrencyWidget = new SingleValueWidget({
            width: 12,
            height: 4,
            title: 'ClaimedAccountConcurrency',
            metrics: [ claimedAccountConcurrency ],
            sparkline: true,
            period: Duration.minutes(1),
        });

        const concurrentExecutions = new Metric({
            period: Duration.minutes(1),
            namespace: 'AWS/Lambda',
            statistic: 'Max',
            metricName: 'ConcurrentExecutions',
            color: '#00819c',
            label: '[max: ${MAX}] Monitoring the Region-Level Active Concurrent Invocations',
        });

        const concurrentExecutionsWidget = new SingleValueWidget({
            width: 12,
            height: 4,
            title: 'ConcurrentExecutions',
            metrics: [ concurrentExecutions ],
            sparkline: true,
            period: Duration.minutes(1),
        });

        // Dashboard and widgets
        this.dashboard.addWidgets(new TextWidget({
            width: 24,
            height: 1,
            markdown: markdownSlackChannelText
        }));

        this.dashboard.addWidgets(claimedAccountConcurrencyWidget, concurrentExecutionsWidget)

        // Composite Alarms
        const throttleCompositeAlarm = new CompositeAlarm(this, 'LambdaThrottleCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...throttleAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'ThrottleCompositeAlarm',
        });
        this.subscribeAlarm(throttleCompositeAlarm);

        const errorCompositeAlarm = new CompositeAlarm(this, 'LambdaErrorCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...errorAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'ErrorCompositeAlarm',
        });
        this.subscribeAlarm(errorCompositeAlarm);

        const durationCompositeAlarm = new CompositeAlarm(this, 'LambdaDurationCompositeAlarm', {
            alarmRule: AlarmRule.anyOf(...durationAlarms.map(alarm => AlarmRule.fromAlarm(alarm, AlarmState.ALARM))),
            // compositeAlarmName: 'DurationCompositeAlarm',
        });
        this.subscribeAlarm(durationCompositeAlarm);

        // Add composite alarms as widgets on the dashboard
        this.dashboard.addWidgets(new AlarmStatusWidget({
            alarms: [ throttleCompositeAlarm ],
            width: 4,
            height: 3,
            title: 'Lambda Throttles Composite Alarm',
        }), new AlarmStatusWidget({
            alarms: [ errorCompositeAlarm ],
            width: 4,
            height: 3,
            title: 'Lambda Errors Composite Alarm',
        }), new AlarmStatusWidget({
            alarms: [ durationCompositeAlarm ],
            width: 4,
            height: 3,
            title: 'Lambda Duration Composite Alarm',
        }), new aws_cloudwatch.LogQueryWidget({
            title: 'Check Over Provisioned Memory For Your Lambda Functions',
            logGroupNames: logGroups,
            width: 12,
            height: 3,
            view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
            queryString: `
            filter @type = "REPORT"
            | stats max(@memorySize / 1000 / 1000) as ProvisionedMB,
            min(@maxMemoryUsed / 1000 / 1000) as MinUsedMB,
            avg(@maxMemoryUsed / 1000 / 1000) as AvgUsedMB,
            max(@maxMemoryUsed / 1000 / 1000) as MaxUsedMB,
            ProvisionedMB - MaxUsedMB as OverProvisionedMB
            `,
        }));

        // Using dynamic labels here
        this.dashboard.addWidgets(new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'Lambda Throttles',
            left: functions.map((fn, index) => fn.metricThrottles({
                statistic: 'Sum',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || fn.functionName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'Lambda Errors',
            left: functions.map((fn, index) => fn.metricErrors({
                statistic: 'Sum',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || fn.functionName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'Lambda Duration (p90)',
            left: functions.map((fn, index) => fn.metricDuration({
                statistic: 'p90',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || fn.functionName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }), new GraphWidget({
            width: 24,
            height: dynamicHeight,
            title: 'Lambda Invocations',
            left: functions.map((fn, index) => fn.metricInvocations({
                statistic: 'Sum',
                period: Duration.minutes(1),
                label: `\[max: \${MAX}\] ${customLabels[index] || fn.functionName}`,
            })),
            legendPosition: LegendPosition.RIGHT,
        }));

        this.dashboard.addWidgets(new TableWidget({
            title: 'Lambda Event Processing Duration',
            height: tableWidgetHeight,
            width: 24,
            layout: TableLayout.HORIZONTAL,
            summary: {
                columns: [
                    TableSummaryColumn.MAXIMUM,
                    TableSummaryColumn.MINIMUM,
                    TableSummaryColumn.AVERAGE,
                ],
                hideNonSummaryColumns: false,
            },
            thresholds: [
                TableThreshold.above(1000, Color.RED),
                TableThreshold.between(700, 1000, Color.ORANGE),
                TableThreshold.below(500, Color.GREEN),
            ],
            metrics: functions.map((fn, index) => fn.metricDuration({
                statistic: 'p90',
                period: Duration.minutes(1), // label: customLabels[index] || `Duration ${fn.node.id}`,
                label: customLabels[index] || `${fn.node.id}`,
            }))
        }));

        this.dashboard.addWidgets(new TextWidget({
            width: 24,
            height: 1,
            markdown: markdownCloudwatchText,
        }));

        // Query the logs: filter the logs for errors.
        this.dashboard.addWidgets(new aws_cloudwatch.LogQueryWidget({
            title: 'Lambda Error Logs',
            logGroupNames: logGroups,
            width: 24,
            height: 11,
            view: aws_cloudwatch.LogQueryVisualizationType.TABLE,
            queryString: `
            fields @timestamp, unmask(@message)
            | filter @message like /(?i)error/
            | sort @timestamp desc
            | display @message
            | limit 30
    `,
        }));

        return {
            alarms: [
                ...throttleAlarms,
                ...errorAlarms,
                ...durationAlarms
            ],
        }
    }
}
