// `jwt.js` - how to used in combination with JSON Web Tokens (JWT) `securityDefinition`
import "reflect-metadata";

import {Request, ResponseToolkit, Server, ServerRoute} from "@hapi/hapi";

import {
  Description,
  Email,
  ItemType,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEmpty,
  Optional,
  Required
} from "./";

const Hapi = require('@hapi/hapi');
const Basic = require('@hapi/basic');
const Blipp = require('blipp');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');

const HapiSwagger = require('hapi-swagger');


import { ClassValidator } from './'

class ExampleTop extends ClassValidator{
  @Required()
  @Email()
  @Description('please provide a valid email')
  email: string='myemail@some.example';
}

class Example extends ExampleTop{
  @Required()
  @Description('evaluation')
  eval: number=1;
}

const payload = Example.toObject();
//console.log('example schema', payload);


class Params extends ClassValidator{
  @Required()
  id:number;
}
const params = Params.toObject();


let swaggerOptions = {
  info: {
    title: 'Test API Documentation',
    description: 'This is a sample example of API documentation.'
  },
};
//test with form-urlencoded
const plugins = {
  'hapi-swagger': {
    payloadType: 'form'
  }
};

const ser = async () => {
  const server = Hapi.Server({
    host: 'localhost',
    port: 3001
  });


  // Blipp - Needs updating for Hapi v17.x
  await server.register([
    Inert,
    Vision,
    Blipp,
    {
      plugin: HapiSwagger,
      options: swaggerOptions,
    }
  ]);

  server.route({
    method: 'PUT',
    path: '/v1/store/{id?}',
    options: {
      handler: function (request:Request, h:ResponseToolkit) {
        return h.response('success');
      },
      description: 'Update sum',
      notes: ['Update a sum in our data store'],
      tags: ['api'],
      //plugins
      validate: {
        params,
        payload
      }
    }
  });

  await server.start();
  return server;
};

ser()
  .then(server => {
    console.log(`Server listening on ${server.info.uri}/documentation`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
