import * as AWS  from 'aws-sdk';
import * as QueryString from 'querystring';

const iot = new AWS.Iot();

export async function handler(event: any) {

    const endpoint = await iot.describeEndpoint({
        endpointType: 'iot:Data',
    }).promise();

    const requestParams = parseRequest(event.body);
    console.log(requestParams);

    const iotdata = new AWS.IotData({
        endpoint: endpoint.endpointAddress,
    });

    await iotdata.publish({
        topic: 'HomeControl/raspberrypi',
        payload: JSON.stringify(requestParams),
    }).promise();

    return {
        statusCode: 200,
        body: '操作を受け付けました。',
    }
}

export function parseRequest(body: any): RequestParams {
    const query = QueryString.parse(body);
    console.log(JSON.stringify(query));

    const pattern = /^(\w+) (\w+)$/;
    const result = pattern.exec(String(query.text));

    if (String(query.command) !== '/control' ) {
        throw new Error('Unknown command.');
    }
    if (result == null) {
        throw new Error('Invavlid command params.');
    }

    return {
        token: String(query.token),
        team_domain: String(query.team_domain),
        command: String(query.command),
        target: result[1],
        param: result[2],
    }
}

export interface RequestParams {
    token: string;
    team_domain: string;
    command: string;
    target: string;
    param: string;
}
