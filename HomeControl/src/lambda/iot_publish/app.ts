import * as AWS  from 'aws-sdk';

const iot = new AWS.Iot();

export async function handler(event: any) {

    const endpoint = await iot.describeEndpoint({
        endpointType: 'iot:Data',
    }).promise();

    const iotdata = new AWS.IotData({
        endpoint: endpoint.endpointAddress,
    });

    await iotdata.publish({
        topic: 'HomeControl/raspberrypi',
        payload: event.body,
    }).promise();

    return {
        statusCode: 200,
        body: '操作を受け付けました。',
    }
}
