---
sidebar_position: 4
---

# AWS Deployment

Deploy QuickRTC to Amazon Web Services EC2.

## Prerequisites

1. Install [AWS CLI](https://aws.amazon.com/cli/)
2. Configure credentials:
   ```bash
   aws configure
   ```
3. Create an EC2 key pair in your target region

## Quick Deploy

### 1. Create Security Group

```bash
# Create security group
aws ec2 create-security-group \
  --group-name quickrtc-sg \
  --description "QuickRTC security group"

# Allow SSH
aws ec2 authorize-security-group-ingress \
  --group-name quickrtc-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP/HTTPS
aws ec2 authorize-security-group-ingress \
  --group-name quickrtc-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name quickrtc-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow WebRTC UDP ports
aws ec2 authorize-security-group-ingress \
  --group-name quickrtc-sg \
  --protocol udp \
  --port 40000-40100 \
  --cidr 0.0.0.0/0
```

### 2. Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 instance (t3.medium recommended)
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.medium \
  --key-name your-key-pair \
  --security-groups quickrtc-sg \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=quickrtc}]'
```

### 3. Connect and Deploy

```bash
# Get public IP
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=quickrtc" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text

# SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
newgrp docker

# Clone and deploy
git clone https://github.com/vidya-hub/QuickRtc.git
cd QuickRtc/quickrtc-example
export ANNOUNCED_IP=<public-ip>
./run.sh ssl-prod
```

Your app is now available at `https://<public-ip>`.

## Architecture

```
Internet
    │
    ├── ALB (optional) ──► EC2 Instance
    │                          ├── nginx (443)
    │                          ├── client container
    │                          └── server container
    │
    └── UDP (40000-40100) ──► EC2 Instance (direct)
```

:::warning UDP and Load Balancers
WebRTC UDP traffic cannot go through AWS ALB/NLB effectively. UDP ports must be exposed directly on the EC2 instance.
:::

## Instance Types

| Instance | vCPU | RAM | Use Case | Est. Cost |
|----------|------|-----|----------|-----------|
| t3.small | 2 | 2GB | Testing | ~$15/mo |
| t3.medium | 2 | 4GB | Small (5-10 users) | ~$30/mo |
| t3.large | 2 | 8GB | Medium (10-20 users) | ~$60/mo |
| c5.xlarge | 4 | 8GB | Large (20-50 users) | ~$120/mo |

:::tip
mediasoup is CPU-intensive. For production, consider compute-optimized (C5) instances.
:::

## Let's Encrypt SSL

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# Set domain and email
export DOMAIN=rtc.yourdomain.com
export EMAIL=you@example.com

# Run SSL setup
cd QuickRtc/quickrtc-example
./run.sh gcloud-ssl  # Works on any server, not just GCP
```

## Elastic IP

Assign a static IP to prevent IP changes on instance restart:

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
  --instance-id i-xxxx \
  --allocation-id eipalloc-xxxx
```

## Auto-Start on Boot

Create a systemd service:

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# Create service file
sudo tee /etc/systemd/system/quickrtc.service << 'EOF'
[Unit]
Description=QuickRTC Video Conferencing
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/QuickRtc/quickrtc-example
Environment=ANNOUNCED_IP=YOUR_PUBLIC_IP
ExecStart=/home/ubuntu/QuickRtc/quickrtc-example/run.sh ssl-prod
ExecStop=/home/ubuntu/QuickRtc/quickrtc-example/run.sh stop
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl enable quickrtc
sudo systemctl start quickrtc
```

## CloudFormation Template

For automated deployments, use this CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: QuickRTC deployment

Parameters:
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair

Resources:
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: QuickRTC security group
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: udp
          FromPort: 40000
          ToPort: 40100
          CidrIp: 0.0.0.0/0

  Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0c7217cdde317cfec
      InstanceType: t3.medium
      KeyName: !Ref KeyName
      SecurityGroups:
        - !Ref SecurityGroup
      UserData:
        Fn::Base64: |
          #!/bin/bash
          curl -fsSL https://get.docker.com | sh
          usermod -aG docker ubuntu
          su - ubuntu -c "git clone https://github.com/vidya-hub/QuickRtc.git"
          su - ubuntu -c "cd QuickRtc/quickrtc-example && ./run.sh ssl-prod"

Outputs:
  PublicIP:
    Value: !GetAtt Instance.PublicIp
```

Deploy with:
```bash
aws cloudformation create-stack \
  --stack-name quickrtc \
  --template-body file://quickrtc.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=your-key-pair
```

## Troubleshooting

### Cannot SSH into instance

```bash
# Check security group allows SSH
aws ec2 describe-security-groups --group-names quickrtc-sg

# Check instance state
aws ec2 describe-instances --filters "Name=tag:Name,Values=quickrtc"
```

### WebRTC not connecting

1. Verify security group allows UDP 40000-40100
2. Check ANNOUNCED_IP matches public IP
3. Ensure Elastic IP is associated (if using)

### High latency

- Choose a region close to your users
- Consider using c5 (compute-optimized) instances
- Check network performance with `iperf3`

## Cleanup

```bash
# Terminate instance
aws ec2 terminate-instances --instance-ids i-xxxx

# Delete security group (after instance is terminated)
aws ec2 delete-security-group --group-name quickrtc-sg

# Release Elastic IP
aws ec2 release-address --allocation-id eipalloc-xxxx
```
