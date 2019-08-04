import * as AWS from 'aws-cdk';
import { print } from 'util';

export async function handler(event: string) {
    print(event)
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'ok!!!',
        }),
    }
}
