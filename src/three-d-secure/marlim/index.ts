import { collectDevice } from './device';
import { processChallengeWithIframe } from './challenge';
import { processSessionHandler } from './ddc';
import { postJson } from './http';
import { getConfig, setConfig } from './state';
import { AuthenticateResponse, InitConfig, ParsedAuthenticate, SetupResponse } from './types';
import { validateAuthenticate, validateInit } from './validate';

export function init(config: unknown): void {
  setConfig(validateInit(config));
}

async function createSetup(
  client: InitConfig,
  params: ParsedAuthenticate
): Promise<{ sessionId: string; cardId: string }> {
  try {
    const response = await postJson<SetupResponse>(client.env, '/v3/3ds/setup', client.token, {
      card_id: params.card_id,
      card_hash: params.card_hash,
      card_cvv: params.card?.cvv,
      card_expiration_date: params.card?.expiration_date,
      card_holder_name: params.card?.holder_name,
      card_number: params.card?.number,
    });
    const { access_token, data_collection_url, session_id, card_id } = response;
    if (!access_token || !data_collection_url) {
      throw new Error('Invalid API response: access_token or data_collection_url are missing.');
    }
    await processSessionHandler({
      accessToken: access_token,
      dataCollectionUrl: data_collection_url,
      env: client.env,
    });
    return { sessionId: session_id, cardId: card_id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error creating 3DS session';
    throw new Error(message);
  }
}

function runAuthenticate(
  client: InitConfig,
  body: Record<string, unknown>
): Promise<{ threedsAuthenticationId: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await postJson<AuthenticateResponse>(
        client.env,
        '/v3/3ds/authenticate',
        client.token,
        body
      );
      if (response.challenge) {
        await processChallengeWithIframe({
          url: response.challenge.url,
          accessToken: response.challenge.access_token,
          windowSize: response.challenge.window_size,
          env: client.env,
        });
      }
      resolve({ threedsAuthenticationId: response.authentication_id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error 3DS authentication';
      reject(message);
    }
  });
}

export async function authenticate(payload: unknown): Promise<{
  card_id: string;
  threeds_authentication_id: string;
}> {
  const config = getConfig();
  if (!config) throw new Error('SDK not initialized');

  const parsed = validateAuthenticate(payload, config.env);
  const setup = await createSetup(config, parsed);

  const customer = parsed.customer;
  const body = {
    challenge: parsed.challenge,
    amount: parsed.amount,
    soft_descriptor_challenge: parsed.soft_descriptor_challenge,
    card_id: setup.cardId,
    session_id: setup.sessionId,
    customer: {
      name: customer.name,
      document_number: customer.document_number,
      email: customer.email,
      phone: {
        number: customer.phone.number,
        area_code: customer.phone.area_code,
        country_code: customer.phone.country_code,
      },
      address: {
        country: customer.address.country,
        state: customer.address.state,
        city: customer.address.city,
        neighborhood: customer.address.neighborhood,
        number: customer.address.number,
        street: customer.address.street,
        zipcode: customer.address.zipcode,
        complement: customer.address.complement,
      },
    },
    device: collectDevice(),
  };

  const result = await runAuthenticate(config, body);
  return {
    card_id: setup.cardId,
    threeds_authentication_id: result.threedsAuthenticationId,
  };
}

const api = { init, authenticate };
export default api;
