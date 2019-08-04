import os
import configparser
import time
import json
import RPi.GPIO as GPIO
import logging
from logging import getLogger, Formatter, FileHandler
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient

# Use PIN 7 (GPIO 4)
PIN_AIRCON_ON = 7

# programme finish trigger file
FINISH_FILE = 'finish.txt'

# logger setting
handler_format = Formatter('[%(asctime)s][%(name)s][%(levelname)s] %(message)s')

file_handler = FileHandler('main.log', 'a')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(handler_format)

logger = getLogger(__name__)
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)


def main():
    logger.info('Start home controller')

    init_gpio()

    configs = parse_config_file()

    logger.info(json.dumps(configs, indent=4))

    # https://s3.amazonaws.com/aws-iot-device-sdk-python-docs/sphinx/html/index.html
    client = AWSIoTMQTTClient(configs['client_id'])
    client.configureEndpoint(configs['endpoint'], configs['port'])
    client.configureCredentials(configs['root_ca'], configs['private_key'], configs['certificate'])

    client.configureAutoReconnectBackoffTime(1, 32, 20)
    client.configureOfflinePublishQueueing(-1)
    client.configureDrainingFrequency(2)
    client.configureConnectDisconnectTimeout(10)
    client.configureMQTTOperationTimeout(5)

    client.connect()
    client.subscribe(configs['topic'], 1, subscribe_callback)

    while True:
        time.sleep(5)

        if is_finish():
            os.remove(FINISH_FILE)
            GPIO.cleanup()
            logger.info('Finish home controller')
            break


def init_gpio():
    GPIO.setmode(GPIO.BOARD)
    GPIO.setup(PIN_AIRCON_ON, GPIO.OUT, initial=GPIO.HIGH)


def parse_config_file():
    config = configparser.ConfigParser()
    config.read('config.ini')

    return {
        'root_ca': config['AWS_IOT_CONNECT']['ROOT_CA'],
        'private_key': config['AWS_IOT_CONNECT']['PRIVATE_KEY'],
        'certificate': config['AWS_IOT_CONNECT']['CERTIFICATE'],
        'client_id': config['AWS_IOT_CORE']['CLIENT_ID'],
        'endpoint': config['AWS_IOT_CORE']['ENDPOINT'],
        'port': int(config['AWS_IOT_CORE']['PORT']),
        'topic': config['AWS_IOT_CORE']['TOPIC']
    }


def subscribe_callback(client, userdata, message):
    topic = message.topic
    payload = json.loads(message.payload)

    logger.info(f'from topic: {topic}')
    logger.info(f'Received a new message: {json.dumps(payload, indent=4)}')

    control(payload)


def control(params):
    if is_control(params) == False:
        return

    if is_aircon_on(params):
        logger.info('Execute PIN_AIRCON_ON')
        execute(PIN_AIRCON_ON)


def execute(pin_no):
    GPIO.output(pin_no, True)
    time.sleep(0.5)
    GPIO.output(pin_no, False)
    time.sleep(0.5)


def is_finish():
    if os.path.isfile(FINISH_FILE):
        return True
    return False


def is_control(params):
    if params['command'] == '/control':
        return True
    return False


def is_aircon_on(params):
    if params['target'] == 'aircon' and params['param'] == 'on':
        return True
    return False


if __name__ == '__main__':
    main()
