import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iot from '@aws-cdk/aws-iot';
import * as role from '@aws-cdk/aws-iam';
import { ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import cdk = require('@aws-cdk/core');
import { PassthroughBehavior } from '@aws-cdk/aws-apigateway';

export class HomeControlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // IoT Things
    const raspberryPi = new iot.CfnThing(this, 'Raspberry Pi', {
      thingName: 'HomeControl-RaspberryPi'
    });

    // Role
    const apiRole = new role.Role(this, 'ApiRole', {
      roleName: 'HomeControl-ApiRole',
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AWSIoTDataAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'HomeControlApi', {
      restApiName: 'HomeControlApi',
    });

    const integration = new apigateway.AwsIntegration({
      service: 'iotdata',
      subdomain: process.env.IOT_ENDPOINT,
      integrationHttpMethod: 'POST',
      path: 'topics/HomeControl/raspberrypi',
      options: {
        credentialsRole: apiRole,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
      },
    });

    const controlResource = api.root.addResource('control');
    controlResource.addMethod('POST', integration, {
      methodResponses: [
        { statusCode: '200', }
      ]
    });
  }
}

const app = new cdk.App();
new HomeControlStack(app, 'HomeControlStack');
app.synth();
