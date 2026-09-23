#!/bin/bash
# ==============================================================================
# Yoka Store — Hostinger VPS Provisioning & System Hardening Script
# Target OS: Ubuntu 24.04 LTS (x86_64)
# Production Launch Target: Oct 01, 2026
# ==============================================================================
set -e

echo ">>> [1/8] Updating package index and system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git ufw fail2ban unzip htop net-tools software-properties-common

echo ">>> [2/8] Creating non-root deploy user 'yoka'..."
if id "yoka" &>/dev/null; then
    echo "User 'yoka' already exists."
else
    adduser --gecos "" --disabled-password yoka
    usermod -aG sudo yoka
    echo "yoka ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/yoka
fi

mkdir -p /home/yoka/.ssh
if [ -f ~/.ssh/authorized_keys ]; then
    cp ~/.ssh/authorized_keys /home/yoka/.ssh/
    chown -R yoka:yoka /home/yoka/.ssh
    chmod 700 /home/yoka/.ssh
    chmod 600 /home/yoka/.ssh/authorized_keys
fi

echo ">>> [3/8] Hardening SSH..."
sed -i 's/#*PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#*PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd || systemctl restart ssh

echo ">>> [4/8] Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

echo ">>> [5/8] Installing Node.js 20 LTS, pnpm, pm2, and typescript..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 pnpm typescript

echo ">>> [6/8] Installing and configuring MySQL 8.0 Server..."
apt-get install -y mysql-server
systemctl enable mysql
systemctl start mysql

# Apply optimized my.cnf if present
if [ -f "$(dirname "$0")/my.cnf" ]; then
    cp "$(dirname "$0")/my.cnf" /etc/mysql/conf.d/yoka.cnf
    systemctl restart mysql
fi

echo ">>> [7/8] Installing and configuring Redis 7.2 Server..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

if [ -f "$(dirname "$0")/redis.conf" ]; then
    cp "$(dirname "$0")/redis.conf" /etc/redis/redis.conf
    systemctl restart redis-server
fi

echo ">>> [8/8] Installing and enabling Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

echo "=============================================================================="
echo ">>> Hostinger VPS Provisioning Complete!"
echo ">>> Status check:"
systemctl is-active mysql && echo "MySQL: running"
systemctl is-active redis-server && echo "Redis: running"
systemctl is-active nginx && echo "Nginx: running"
echo "=============================================================================="
