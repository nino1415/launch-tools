#!/usr/bin/env -S yarn node
const { calculateFee, GasPrice } = require("@cosmjs/stargate");
const { fromBase64, toHex, toUtf8 } = require("@cosmjs/encoding");
const { toBinary } = require("@cosmjs/cosmwasm-stargate");
const utils = require('./utils');

async function main() {
  const config = await utils.getChainConfig()
  const coinConfig = await utils.getChainCoinConfig(config)
  const userWallet = await utils.getLabelledWallet(config, utils.agentnyms[0])
  const user = await utils.getAgentClient(config, utils.agentnyms[0])
  const managerWallet = await utils.getLabelledWallet(config, utils.catnyms[0])
  const managerContract = `${managerWallet.contractAddress}`
  const iftttSimpleWallet = await utils.getLabelledWallet(config, utils.catnyms[1])
  const iftttSimpleContract = `${iftttSimpleWallet.contractAddress}`
  const gasPrice = GasPrice.fromString(`0.025${coinConfig.gas}`)
  const fee = calculateFee(200_000, gasPrice)
  const memo = `tasks MEOW!`;
  const userAddress = `${userWallet.accounts[0].address}`

  const sampleActions = [
    {
      wasm: {
        execute: {
          contract_addr: iftttSimpleContract,
          funds: [],
          /// msg is the json-encoded ExecuteMsg struct (as raw Binary)
          msg: toBinary({ increment: {} }),
          // msg: toBinary({ Increment: {} }),
          // msg: toBinary(JSON.stringify({ Increment: {} })),


          // BAD:
          // msg: toUtf8(JSON.stringify({ Increment: {} })),
          // msg: {
          //   wasm: {
          //     execute: {
          //       Increment: {},
          //     }
          //   }
          // },
          // msg: toBinary({
          //   wasm: {
          //     execute: {
          //       Increment: {},
          //     }
          //   }
          // }),
          // funds: null,
        }
      }
    },
    {
      staking: {
        delegate: {
          // See template/.wasmd/config/genesis.json
          validator: 'wasmvaloper1tjgue6r5kqj5dets24pwaa9u7wuzucpwfsgndk',
          amount: {
            amount: '100',
            denom: coinConfig.gas
          },
        }
      }
    },
    {
      distribution: {
        withdraw_delegator_reward: {
          validator: 'wasmvaloper1tjgue6r5kqj5dets24pwaa9u7wuzucpwfsgndk',
        }
      }
    },
  ]


  // TaskRequest {
  //   pub interval: Interval,
  //   pub boundary: Boundary,
  //   pub stop_on_fail: bool,
  //   pub action: CosmosMsg,
  //   pub rules: Option<Vec<Rule>>,
  // }
  const tasks = [
    // {
    //   // interval: 'Once',
    //   // interval: 'Immediate',
    //   interval: {
    //     Block: 15
    //   },
    //   // interval: {
    //   //   Cron: '*/5 * * * * *'
    //   // },
    //   boundary: {
    //     start: null,
    //     end: null,
    //   },
    //   stop_on_fail: false,
    //   action: sampleActions[1],
    //   // TODO: setup a rules example too
    //   rules: [],
    // },
    // {
    //   interval: {
    //     Cron: '*/5 * * * * *'
    //   },
    //   boundary: { start: null, end: null, },
    //   stop_on_fail: false,
    //   action: sampleActions[2],
    //   rules: [],
    // },

    // IFTTT Simple (1 rule)
    {
      interval: {
        Block: 1
      },
      boundary: { start: null, end: null, },
      stop_on_fail: false,
      action: sampleActions[0],
      rules: [
        // {
        //   contract_id: iftttSimpleContract,
        //   // msg: Binary,
        //   msg: {
        //     CheckModulo: {}
        //   },
        // }
      ],
    },

    // // IFTTT Simple (2 rules)
    // {
    //   interval: {
    //     Block: 1
    //   },
    //   boundary: { start: null, end: null, },
    //   stop_on_fail: true,
    //   action: sampleActions[0],
    //   rules: [
    //     {
    //       contract_id: iftttSimpleContract,
    //       // msg: Binary,
    //       msg: {
    //         CheckModulo: {}
    //       },
    //     },
    //     {
    //       contract_id: iftttSimpleContract,
    //       // msg: Binary,
    //       msg: {
    //         CheckInputModulo: {}
    //       },
    //     },
    //   ],
    // },
  ]

  // // 2. Execute proxy_call
  // // ProxyCall {}
  // try {
  //   const ri_tx = await user.execute(
  //     userAddress,
  //     iftttSimpleContract,
  //     { increment: {} },
  //     fee,
  //     memo
  //   );
  //   console.log('iftttSimpleContract tx hash', ri_tx.transactionHash, JSON.stringify(ri_tx));
  // } catch (e) {
  //   console.log('iftttSimpleContract FAILED', e);
  //   return;
  // }

  // 1. Create several tasks
  // CreateTask { task: TaskRequest }
  for await (const task of tasks) {
    const funds = [{ amount: '150000', denom: coinConfig.gas }]
    try {
      const r_tx = await user.execute(
        userAddress,
        managerContract,
        { create_task: { task } },
        fee,
        memo,
        funds,
      );
      console.log('task create tx hash', r_tx.transactionHash, r_tx);
    } catch (e) {
      console.log('TASK CREATE FAILED', e);
      return;
    }
  }

  // 2. Get list of tasks
  // GetTasks { }
  try {
    const q_tx = await user.queryContractSmart(
      managerContract,
      { get_tasks: {} },
    );
    console.log('get tasks', q_tx);
  } catch (e) {
    console.log('GET FAILED', e);
    return;
  }
}

main().then(
  () => {
    console.info("All meows complete.");
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);