#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EksPrivateStack } from '../lib/eks-private-stack';
import { Net } from '../lib/net';

const app = new cdk.App();
const env = { 
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT
};
const net = new Net(app, 'Net', { env });
new EksPrivateStack(app, 'EksPrivateStack', { env, vpc: net.vpc });