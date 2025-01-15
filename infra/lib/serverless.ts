import * as cdk from 'aws-cdk-lib';
import { join } from 'path';
import { Construct } from 'constructs';
import { 
    Role, 
    ServicePrincipal, 
    PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import  * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Lambda extends cdk.Stack {

    constructor(app:Construct, id:string, props: cdk.StackProps){
        super(app, id, props)

        console.log("deploying lambda")

        const role = new Role(this, String(process.env.LAMBDA_NAME)+"-role", {
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

        const lamdaLayers = new lambda.LayerVersion(this, String(process.env.LAMBDA_NAME)+'-layer', {
            code: lambda.Code.fromAsset(join(
                __dirname,
                "../../back/email/layers/layer-shared"
            ),),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            description: String(process.env.LAMBDA_LAYER_DESCRIPTION)
        });

        const repo = ecr.Repository.fromRepositoryName(this, String(process.env.LAMBDA_NAME)+'EcrRepo', String(process.env.ECR_REPOSITORY_DEV));

        const lambdaIA = new lambda.DockerImageFunction(this, String(process.env.LAMBDA_NAME)+'-docker', {
            code: lambda.DockerImageCode.fromEcr(repo, { tag: 'latest' }),
            functionName: String(process.env.LAMBDA_NAME),
            role: role,
            description: String(process.env.LAMBDA_DESCRIPTION),
            memorySize: 3000, 
            timeout: cdk.Duration.minutes(5),
            layers: [lamdaLayers],
          });
        
        repo.grantPullPush(lambdaIA)
        repo.grantPull(lambdaIA)
        repo.repositoryUriForTag('latest')
        lambdaIA.addEnvironment('DOCKER_IMAGE_URI', repo.repositoryUriForTag('latest'));


        new cdk.CfnOutput(this, String(process.env.LAMBDA_NAME)+'-cnf', {
            value: lambdaIA.functionName,
            description: String(process.env.LAMBDA_DESCRIPTION)
        });

    }
}