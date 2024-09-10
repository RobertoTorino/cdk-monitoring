import { Template } from 'aws-cdk-lib/assertions';
import { env } from '../lib/shared';
import { App } from 'aws-cdk-lib';
import { MonitoringStack } from '../lib/monitoring-stack';


const app = new App();
test('Matches SnapShot', () => {
    new MonitoringStack(app, 'MonitoringStack', {
        description: 'Stack for AWS resources',
        env,
    });
    const testStackOutput = app
        .synth()
        .getStackArtifact('MonitoringStack').template;

    expect(Template.fromJSON(testStackOutput)).toMatchSnapshot();
});
