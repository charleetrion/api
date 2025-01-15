import * as cdk from 'aws-cdk-lib';
import {
    Stack, 
    StackProps,
    Duration
} from 'aws-cdk-lib'
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {Construct, Node} from "constructs";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import  * as lambda from 'aws-cdk-lib/aws-lambda';


export class LambdaInfra extends cdk.Stack {
    
    constructor(scope:Construct, id:string, props?:StackProps){
        super(scope, id, props)

        console.log('Deploy our lambda 🚀')
        if(process.env.LAMBDA_NAME !== undefined && process.env.LAMBDA !== undefined) {

            const role = new Role(this, String(process.env.LAMBDA_NAME)+"lambda-role", {
                assumedBy: new ServicePrincipal(String(process.env.SERVICE_ROLE)),
                roleName: `${process.env.LAMBDA_NAME}`,    
                inlinePolicies: {
                    LambdaReadPolicy: new iam.PolicyDocument({
                        statements: [
                            new PolicyStatement({
                                actions: [
                                    "secretsmanager:*",
                                    "autoscaling:Describe*",
                                    "cloudwatch:*",
                                    "logs:*",
                                    "sns:*",
                                    "s3:*",
                                    "iam:GetPolicy",
                                    "iam:GetPolicyVersion",
                                    "iam:GetRole",
                                    "oam:ListSinks"
                                ],
                                resources: ['*'],
                            }),
                        ],
                    }),
                }
            });
            
            const lambdaHandler = new NodejsFunction(this, String(process.env.LAMBDA_NAME) + '-lambda', {
                entry: join(
                    __dirname,
                    String(process.env.ENTRY_LAMBDA)
                ),
                depsLockFilePath: join(
                    __dirname,
                    String(process.env.DEPS_LOCK_FILE_PATH)
                ),
                functionName: String(process.env.LAMBDA_NAME),
                handler: 'index.handler',
                runtime:Runtime.NODEJS_18_X,
                timeout: Duration.minutes(1),
                role: role,
                description: process.env.LAMBDA_DESCRIPTION,
                memorySize: 256,
                environment:{
                    LAMBDA: String(process.env.LAMBDA),
                    SENDGRID_API_KEY: String(process.env.SENDGRID_API_KEY),
                    SNS_TOPIC: String(process.env.SNS_TOPIC),
                    BUCKET_NAME: String(process.env.BUCKET_NAME),
                    REGION: String(process.env.AWS_REGION)
                }
            });

            lambdaHandler.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:*', 's3:*', 'sns:*'],
                resources: ['arn:aws:dynamodb:us-east-1:408058604061:table/payment', 
                            'arn:aws:s3:::tutocode-905418384243',
                            'arn:aws:sns:us-east-1:905418384243:email'
                        ],
            }));

            new cdk.CfnOutput(this, process.env.LAMBDA_NAME, {
                value: lambdaHandler.functionName,
                description: process.env.LAMBDA_NAME
            })
                        

        }
            
    }
}