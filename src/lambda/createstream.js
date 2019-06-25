import Axios from 'axios'

exports.handler = async (event, context, callback) => {
  if (event.httpMethod == 'GET') {
    callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        name: "Creater Speckle Stream",
        parameters : [
          {
            name: "streamName",
            type: "string",
          },
        ],
      }),
    })
    return;
  }

  if (event.httpMethod !== 'POST' || !event.body) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({ status: 'Bad Request' }),
    });
    return;
  }

  const {
    baseUrl,
    token,
    streamId,
    input,
    parameters,
  } = JSON.parse(event.body)

  if (!baseUrl || !token || !streamId || !parameters ) {
    callback(null, {
      statusCode: 400,
      body: JSON.stringify({ status: 'Bad Request' }),
    });
    return;
  }

  // Try to send stream objects
  let objectIds = [ ]

  let bucket = [ ],
    maxReq = 50 // magic number; maximum objects to request in a bucket

  for ( let i = 0; i < input.length; i++ ) {
    bucket.push( input[ i ] )
    if ( i % maxReq === 0 && i !== 0 ) {
      let res = await createObjects( bucket );
      objectIds.push(...res)
      bucket = [ ]
    }
  }

  if ( bucket.length !== 0 ) {
    let res = await createObjects( bucket );
    objectIds.push(...res)
  }

  var stream = {name: parameters.streamName, objects: objectIds};
  let result = await createStream(stream);

  callback(null, {
    statusCode: 200,
    body: JSON.stringify(result.streamId)
  })
}

function createObjects( objects ) {
  return new Promise( (resolve, reject) => {
    Axios({
      method: 'POST',
      baseURL: baseUrl,
      url: `objects`,
      data: objects,
    })
    .then( res => resolve( res.data.resources ) )
    .catch( err => reject( err ))
  })
}

function createStream( stream ) {
  return new Promise( ( resolve, reject ) => {
    Axios({
      method: 'POST',
      baseURL: baseUrl,
      url: `streams`,
    })
      .then( res => {
        console.log( res )
        stream.streamId = res.data.resource.streamId
        res.data.resource.onlineEditable = true
        return Axios({
          method: 'PUT',
          baseURL: baseUrl,
          url: `streams/${res.data.resource.streamId}`,
          data: stream,
        })
      } )
      .then( res => resolve( stream ) )
      .catch( err => {
        console.error( err )
        reject( err )
      } )
  } )
}