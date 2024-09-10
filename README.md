# AWS CDK monitoring construct
**Cloudwatch logs, dashboard, metrics and alarms to monitor resources, notifications will be sent to a Slack channel with AWS Chatbot.**

### Monitor Lambda functions
Insights on Lambda function states by using the AWS recommended alarms and corresponding metrics: [AWS Recommended Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html#Lambda). There is a visual metric for invocations but that's just for informational purposes.
By default the dashboard shows the last 3 hours, the time range can be adjusted. The alarm notifications are based on a threshold, only when a threshold is crossed a notification will be send to Slack.
The dashboard contain 3 Lambda metrics with a [composite alarm](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html) on each metric:
1. Number of Lambda throttles.
2. Number of Lambda errors.
3. Event processing duration.

Furthermore, every dashboard has the account level concurrency levels on top for convenience so you don't have to switch between dashboards.
There is also a Logquery widget that shows your over provisioned Lambda functions for the service defined in the dashboard.
All dashboards contain a visualisation table for the Lambda duration times where the color matches the state, green is ok, orange is danger zone, red is not ok.                
There is a widget for the most recent log-groups that contain the keyword "error”, by using a query in cloudwatch logs insights.             
Off course different keywords can be added if you would want that.
All metric panels are clickable and will show all the relevant information per lambda.               

### Monitor SQS queues


### Slack channel
There will appear a notification in Slack if an alarm is triggered.                 
All names are adjusted so it’s easy to see which service/lambda function it represents.            
A screenshot of the state with the date/time will be shown.     
The reason for the alarm and the relevant datapoints are present in the notification.
The error logs can be viewed, if there are any, and it is possible to just view the regular logs.               
It is possible to execute AWS cli commands directly in Slack (all read-only). Chatbot gives hints and examples for that.                
Relevant Alarms will be grouped into threads, so the channel does not get cluttered.                
Clicking on a Lambda or an alarm will link to the resource inside AWS.                  

### Thresholds
To be clear not every error will trigger an alarm, the logic behind this only triggers an alarm if certain conditions are not ok. The target is to only get actionable notifications and not clutter the channel with useless information. An alarm goes only into OK state with the same logic, the threshold must be within the ranges after X datapoints.

* Throttles: threshold crossed when 5 out of the last 5 datapoints (within 5 minutes) were greater than or equal to the threshold (1 throttle error) (minimum 5 datapoints for OK -> ALARM transition).
* Errors: threshold crossed when 3 out of the last 3 datapoints (within 3 minutes) were greater than the threshold (5 errors) (minimum 3 datapoints for OK -> ALARM transition).
* Duration: threshold crossed when 15 out of the last 15 datapoints (within 15 minutes) were greater than the threshold (1000 milliseconds) (minimum 15 datapoints for OK -> ALARM transition).

---

#### Development Info here: [README_DEV.md](README_DEV.md)
