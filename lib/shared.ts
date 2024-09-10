import { Stack, Tags } from 'aws-cdk-lib';


export const env = {
    account: '0123456789',
    region: 'eu-west-1',
};

export enum Environment {
    prod = 'Prod',
}

export const addTags = (stack: Stack, environment: Environment) => {
    Tags.of(stack).add('Application', 'cnca-distr-lambda-monitoring', {
        applyToLaunchedInstances: true,
        includeResourceTypes: [],
    });
    Tags.of(stack).add('Stage', environment, {
        applyToLaunchedInstances: true,
        includeResourceTypes: [],
    });
};

export const slackChannelEndpoint = 'https://global.sns-api.chatbot.amazonaws.com';
export const chatBotNotificationTopic = 'arn:aws:sns:eu-west-1:0123456789:MonitoringLambdaTopic';

export const markdownSlackChannelText = '## [button:primary:Go to the Slack channel](https://app.slack.com/client/TE92U6HDY/C07HS5C9WGZ) [button:primary:Go to Cloudwatch Logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups$3FlogGroupNameFilter$3D$252Faws$252Flambda$252Fprod) [button:primary:Go to AWS Lambda Functions Documentation](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)';
export const markdownSlackChannelSqsText = '## [button:primary:Go to the Slack channel](https://app.slack.com/client/TE92U6HDY/C07HS5C9WGZ) [button:primary:Go to SQS Queues](https://eu-west-1.console.aws.amazon.com/sqs/v3/home?region=eu-west-1#/queues) [button:primary:Go to recommended alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html#SQS)';
export const markdownCloudwatchText = '## [button:primary:Go to Cloudwatch Logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups$3FlogGroupNameFilter$3D$252Faws$252Flambda$252Fprod)';
