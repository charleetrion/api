import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    console.log('Desplegando la infra ECS Fargate 🚀')

    const stack = new cdk.Stack(scope, 'infraCluster', {
      env: {
        account: process.env.ACCOUNT_ID,
        region: process.env.REGION
      }
    });

    // creating the network environment with VPC
    const vpc = new ec2.Vpc(stack, 'vpc-tutorialcode', {
      cidr: "10.1.0.0/16",
      subnetConfiguration: [
        {cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: "Public"},
      ],
      maxAzs: 2,
      vpcName: "vpc-tutorialcode",

    });
      // create cluster ecs
      const cluster = new ecs.Cluster(stack, 'tutorial-code', {
        clusterName: 'tutorialcode',
        vpc: vpc
      });

      const executionRolePolicy =  new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
                    "ecr:GetAuthorizationToken",
                    "ecr:BatchCheckLayerAvailability",
                    "ecr:GetDownloadUrlForLayer",
                    "ecr:BatchGetImage",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ]
        });

        const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDefinition', {
          memoryLimitMiB: 512,
          cpu: 256,
        });
        fargateTaskDefinition.addToExecutionRolePolicy(executionRolePolicy);

        // adds role that allows to connect to dynamodb
        fargateTaskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [String(process.env.TABLE_DYNAMODB_ARN)],
          actions:['dynamodb:*']
        }));

        // create container task
        const container = fargateTaskDefinition.addContainer("paypal-backend", {
          image: ecs.ContainerImage.fromRegistry(String(process.env.ECR_URI)),
          logging: ecs.LogDrivers.awsLogs({streamPrefix: 'paypal-api'}),
          environment: { 
            'NODE_ENV': "production",
          }
        });

        container.addPortMappings({
          containerPort: 3000
        });

        // create security group service
        const securityGroupService = new ec2.SecurityGroup(this, 'securityGroup', {
          vpc:vpc,
          securityGroupName: 'securityGroup'+String(process.env.ECR_REPOSITORY)
        });
        securityGroupService.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(3000));

        // create service.
        const service = new ecs.FargateService(this, 'Service', {
          cluster,
          taskDefinition: fargateTaskDefinition,
          desiredCount:1,
          assignPublicIp: true,
          securityGroups: [securityGroupService]
        });

        /*
        // Setup AutoScaling policy
        const scaling = service.autoScaleTaskCount({ maxCapacity: 6, minCapacity: 2 });
        scaling.scaleOnCpuUtilization('CpuScaling', {
          targetUtilizationPercent: 50,
          scaleInCooldown: cdk.Duration.seconds(60),
          scaleOutCooldown: cdk.Duration.seconds(60)
        });


        // Setup ALB
        const lb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
          vpc,
          internetFacing: true
        })

        const listener = lb.addListener('Listener', {
          port:80
        });

        listener.addTargets('Target', {
          port:80,
          targets:[service],
          healthCheck: {path: '/'}
        });

        listener.connections.allowDefaultPortFromAnyIpv4('Open to the world')
        */
    }
  
}
