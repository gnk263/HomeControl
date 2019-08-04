import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iot from '@aws-cdk/aws-iot';
import * as role from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import { ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Duration } from '@aws-cdk/core';
import cdk = require('@aws-cdk/core');

export class HomeControlStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // IoT Things
    const raspberryPi = new iot.CfnThing(this, 'Raspberry Pi', {
      thingName: 'HomeControl-RaspberryPi',
    });

    // IoT Topic
    const iotTopic = 'HomeControl/RaspberryPi';

    // IoT Policy
    const raspberryPiPolicy = new iot.CfnPolicy(this, 'raspberry Pi Poliry', {
      policyName: 'HomeControl-RaspberryPi-Policy',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: 'iot:Connect',
            Resource: `arn:aws:iot:${this.region}:${this.account}:client/${raspberryPi.ref}`
          },
          {
            Effect: 'Allow',
            Action: 'iot:Subscribe',
            Resource: `arn:aws:iot:${this.region}:${this.account}:topicfilter/${iotTopic}`
          },
        ]
      },
    });

    // Role
    const apiRole = new role.Role(this, 'ApiRole', {
      roleName: 'HomeControl-LambdaRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AWSIoTFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AWSIoTDataAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
    });

    // Lambda
    const iotLambda = new lambda.Function(this, 'IoTLambda', {
      code: lambda.Code.asset('src/lambda/iot_publish'),
      handler: 'app.handler',
      runtime: lambda.Runtime.NODEJS_10_X,
      timeout: Duration.seconds(3),
      role: apiRole,
      environment: {
        IOT_TOPIC: iotTopic,
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'HomeControlApi', {
      restApiName: 'HomeControlApi'
    });

    const integration = new apigateway.LambdaIntegration(iotLambda, {
      proxy: true,
    });

    const controlResource = api.root.addResource('control');
    controlResource.addMethod('POST', integration);
  }
}

const app = new cdk.App();
new HomeControlStack(app, 'HomeControlStack');
app.synth();
