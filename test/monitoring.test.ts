import { App } from 'aws-cdk-lib';
import { env } from '../lib/shared';
import { MonitoringStack } from '../lib/monitoring-stack';



describe('Synthesize tests', () => {
    const app = new App();

    test('Creates the stack without exceptions', () => {
        expect(() => {
            new MonitoringStack(app, 'MonitoringStack', {
                description: 'Stack for Monitoring Lambda Functions',
                env,
            });
        }).not.toThrow();
    });

    test('This app can synthesize completely', () => {
        expect(() => {
            app.synth();
        }).not.toThrow();
    });
});
