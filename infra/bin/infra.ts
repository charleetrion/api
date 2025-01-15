#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {LambdaURI} from '../lib/lambda-python';

const app = new cdk.App();


let env = app.node.tryGetContext('config')

switch(env) {

  case process.env.LAMBDA_CONFIG_URI:
      const lambda_uri = new LambdaURI(app, String(process.env.STACK_NAME), {
        env: {
          account: process.env.AWS_ACCOUNT_ID,
          region: process.env.AWS_REGION
        }
      });
      taggingStack(lambda_uri, 'pc-1', 'eiv', 'dev', 'cc-0001203', 'na', 'na')
      break;

}

function taggingStack(
  stack: Construct, 
  projectCode:string, 
  businessService:string,
  projectName:string,
  environment:string,
  costCenter:string,
  schedule:string,
  ){

  cdk.Tags.of(stack).add('proyecto:project-code', projectCode)
  cdk.Tags.of(stack).add('tutorialcode:bussiness-service', businessService)
  cdk.Tags.of(stack).add('tutorialcode:project-name', projectName)
  cdk.Tags.of(stack).add('tutorialcode:environment', environment)
  cdk.Tags.of(stack).add('tutorialcode:cost-center', costCenter)
  cdk.Tags.of(stack).add('tutorialcode:shedule', schedule)

}
