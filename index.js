const Promise = require('bluebird')
const co = require('bluebird-co')
const libp2p = require('libp2p-ipfs')
const multiaddr = require('multiaddr')
const PeerInfo = Promise.promisifyAll(require('peer-info'))
const pull = require('pull-stream')

const setup = co.wrap(function* () {
  const [infoA, infoB] = yield [
    PeerInfo.createAsync(),
    PeerInfo.createAsync()
  ]

  infoA.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))
  infoB.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))

  const [nodeA, nodeB] = yield [
    Promise.promisifyAll(new libp2p.Node(infoA)),
    Promise.promisifyAll(new libp2p.Node(infoB))
  ]

  yield [
    nodeA.startAsync(),
    nodeB.startAsync()
  ]

  nodeB.handle('/echo/1.0.0', echo)

  const nodeBMultiaddrTCP = multiaddr((nodeB.peerInfo.multiaddrs[0].toString() +
    '/ipfs/' + nodeB.peerInfo.id.toB58String()
  ).replace('0.0.0.0', '127.0.0.0'))
  console.log(nodeBMultiaddrTCP)

  const conn = yield nodeA.dialByMultiaddrAsync(nodeBMultiaddrTCP, '/echo/1.0.0')

  // After A dials B by multiaddr
  // both nodes should have each other in their peer lists
  setTimeout(() => {
    console.log(nodeA.peerBook.getAll())
    console.log(nodeB.peerBook.getAll())
  }, 500)

  // Use A's connection to B's /echo/1.0.0 to send a buffer
  // This should bounce back to us
  pull(
    pull.values([Buffer('hey')]),
    conn,
    pull.collect((err, data) => {
      console.log(data)
    })
  )
})

const echo = (protocol, conn) => {
  pull(conn, conn)
}

setup()

