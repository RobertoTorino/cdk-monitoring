import { aws_sns_subscriptions, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LoggingLevel, SlackChannelConfiguration } from 'aws-cdk-lib/aws-chatbot';
import { slackChannelEndpoint } from './shared';


export class MonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create the KMS key for encrypting the SNS topic
        const key = new Key(this, 'SnsEncryptionKey', {
            description: 'Used to encrypt the SNS Topic',
            enableKeyRotation: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });
        key.grant(new ServicePrincipal('events.amazonaws.com'), 'kms:Decrypt', 'kms:GenerateDataKey');
        key.grant(new ServicePrincipal('cloudwatch.amazonaws.com'), 'kms:Decrypt', 'kms:GenerateDataKey');

        // Create the SNS Topic for ChatBot notifications
        const monitoringTopic = new Topic(this, 'MonitoringTopic', {
            topicName: 'MonitoringTopic',
            displayName: 'MonitoringTopic',
            masterKey: key,
        });
        monitoringTopic.applyRemovalPolicy(RemovalPolicy.DESTROY);
        monitoringTopic.grantPublish(new ServicePrincipal('cloudwatch.amazonaws.com'));
        monitoringTopic.addSubscription(new aws_sns_subscriptions.UrlSubscription(slackChannelEndpoint),);

        // Chatbot configuration
        const slackChannelRole = new Role(this, 'SlackChannelRole', {
            assumedBy: new ServicePrincipal('chatbot.amazonaws.com'),
        });

        slackChannelRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups',
            ],
            resources: [ 'arn:aws:logs:*:*:log-group:/aws/chatbot/*' ],
        }));

        slackChannelRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'cloudwatch:Describe*',
                'cloudwatch:Get*',
                'cloudwatch:List*'
            ],
            resources: [ '*' ],
        }));

        slackChannelRole.addToPolicy(new PolicyStatement({
            effect: Effect.DENY,
            actions: [
                'iam:*',
                's3:GetBucketPolicy',
                'ssm:*',
                'sts:*',
                'kms:*',
                'cognito-idp:GetSigningCertificate',
                'ec2:GetPasswordData',
                'ecr:GetAuthorizationToken',
                'gamelift:RequestUploadCredentials',
                'gamelift:GetInstanceAccess',
                'lightsail:DownloadDefaultKeyPair',
                'lightsail:GetInstanceAccessDetails',
                'lightsail:GetKeyPair',
                'lightsail:GetKeyPairs',
                'redshift:GetClusterCredentials',
                'storagegateway:DescribeChapCredentials'
            ],
            resources: [ '*' ],
        }));

        slackChannelRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'sns:ListSubscriptionsByTopic',
                'sns:ListTopics',
                'sns:Unsubscribe',
                'sns:Subscribe',
                'sns:ListSubscriptions'
            ],
            resources: [ '*' ],
        }));
        slackChannelRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonQFullAccess'))
        slackChannelRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSResourceExplorerReadOnlyAccess'))
        slackChannelRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'))

        const importedSnsTopic = Topic.fromTopicArn(this, 'ImportedSnsTopic', 'arn:aws:sns:eu-west-1:0123456789:importedSnsTopic',);

        const slackChannelConfig = new SlackChannelConfiguration(this, 'SlackChannelConfig', {
            slackChannelConfigurationName: 'SlackChannelConfig',
            slackWorkspaceId: '012345678',
            slackChannelId: '01234567890',
            loggingLevel: LoggingLevel.ERROR,
            role: slackChannelRole,
            notificationTopics: [
                importedSnsTopic
            ],
        },);
        slackChannelConfig.applyRemovalPolicy(RemovalPolicy.DESTROY);
        Tags.of(slackChannelConfig).add('aws-chatbot-loggroup-location', 'LOGGROUP-LOCATION-US-EAST-1',);
    }
}
