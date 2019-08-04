#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { HomeControlStack } from '../lib/home_control-stack';

const app = new cdk.App();
new HomeControlStack(app, 'HomeControlStack');
