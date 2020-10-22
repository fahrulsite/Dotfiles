#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

alias ls='ls --color=auto'
PS1='[\u@\h \W]\$ '

#flutter
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools

#ORACLEDATABASE
export ORACLE_SID=archlinux
export ORACLE_HOME=/home/apps/oracle-xe/pkg/oracle-xe/opt/oracle/product/app/oracle/product/18c/dbhomeXE
export PATH=$PATH:$ORACLE_HOME/bin

