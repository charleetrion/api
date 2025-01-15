import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {ICluster, IEc2TaskDefinition, ITaskDefinition, TaskDefinition, Ec2TaskDefinition, Cluster, Ec2Service, DeploymentControllerType} from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2'
import {IApplicationLoadBalancer, ApplicationLoadBalancer} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';

export class InfraSERVICE extends cdk.Stack {

    public cluster: ICluster
    public task: ITaskDefinition
    public vpc: IVpc
    public Ielb: IApplicationLoadBalancer

    constructor(scope?: Construct, id?: string, props?: cdk.StackProps){
        super(scope, id, props)

        this.cluster = Cluster.fromClusterArn(this, 'cluster', 'arn:aws:ecs:us-east-1:905418384243:cluster/microservices')

        this.task = TaskDefinition.fromTaskDefinitionArn(this, 'task', 'arn:aws:ecs:us-east-1:905418384243:task-definition/authmicroserviceB07A70E2:27')


        this.vpc = Vpc.fromLookup(this, 'Vpc', {
            vpcId: String(process.env.VPC_ID)
        })
        
        const service = new Ec2Service(this, 'Services'+String(process.env.STACK_NAME_SERVICE), {
            serviceName: String(process.env.STACK_NAME_SERVICE),
            cluster: this.cluster,
            taskDefinition: this.task as Ec2TaskDefinition,
            desiredCount:1,
            deploymentController:{
                type: DeploymentControllerType.CODE_DEPLOY
            }
        });

        new cdk.CfnOutput(this, 'ServiceARN', {
            value: service.serviceArn
        })

        // Define CodeDeploy Application
        const application = new codedeploy.EcsApplication(this, 'MyCodeDeployApp');
        
        // Define Target Groups
        const blueTargetGroup = new elb.ApplicationTargetGroup(this, String(process.env.STACK_NAME_SERVICE)+'BlueTargetGroup', {
            vpc: this.vpc,
            targetGroupName: String(process.env.STACK_NAME_SERVICE)+'-alb-blue-tg',
            port: 80,
            healthCheck: {
            interval: cdk.Duration.seconds(60),
            path: '/health',
            timeout: cdk.Duration.seconds(5),
            },
        });
  

        service.attachToApplicationTargetGroup(blueTargetGroup)

        const greenTargetGroup = new elb.ApplicationTargetGroup(this, String(process.env.STACK_NAME_SERVICE)+'GreenTargetGroup', {
            vpc: this.vpc,
            targetGroupName: String(process.env.STACK_NAME_SERVICE)+'-alb-green-tg',
            port: 80,
            healthCheck: {
            interval: cdk.Duration.seconds(60),
            path: '/health',
            timeout: cdk.Duration.seconds(5),
            },
        });

        this.Ielb = ApplicationLoadBalancer.fromLookup(this, 'alb', {
            loadBalancerArn: "arn:aws:elasticloadbalancing:us-east-1:905418384243:loadbalancer/app/ALB/d625990f51dab8c1"
        })
    
        // Adds a listener on port 80 to the ALB
        const albListener = this.Ielb.addListener("AlbListener80", {
            open: false,
            port: 80,
            defaultTargetGroups: [blueTargetGroup],
        });

        // Define CodeDeploy Deployment Group
        new codedeploy.EcsDeploymentGroup(this, 'DeploymentGroup', {
            application,
            service,
            blueGreenDeploymentConfig: {
                listener: albListener,
                blueTargetGroup: blueTargetGroup,
                greenTargetGroup: greenTargetGroup,
            },
            deploymentConfig: codedeploy.EcsDeploymentConfig.ALL_AT_ONCE,
        });
    }
}