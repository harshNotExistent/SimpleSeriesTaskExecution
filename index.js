const fetch = require('node-fetch');

async function get(url){
  try{
    return (await fetch(url)).json()
  }catch(e){
    throw new Error(e.response.body)
  }
}

async function post(url,payload){
  try{
    return (await fetch(url)).json()
  }catch(e){
    throw new Error(e.response.body)
  }
}

class TaskExecutor{

    constructor(context, invoke,process){
        this._invoke = invoke;

        this._process = process? process: (arg)=>{return arg};
        this._context = {
          name:context.name?context.name:"",
          retries: context.retries?context.retries:0,
          payload:context.payload?context.payload:{},
          response:context.response?context.response:{},
          errors:context.error?context.error:{},
        };
        // this._setcontext(context)
        return this;
    }

    static constants = () => {return {
            "RETRIES":"retries",
            "ERROR":"errors",
            "PAYLOAD":"payload",
            "RESPONSE":"response",
    }} 

// let UserManager = new ApiManager({}, fetchUsers,pickRandomItem);

    async run(){
      this._context["retries"] = this._context["retries"] +1;
      try{
        let response = await this._invoke(this._context["payload"]);
        this._context["response"] = response;
        this._context["errors"] = null;
      }catch(e){
        this._context["errors"] = e;
      }
      return this;
    }

    async processData(){
      return await this._process(this._context.response);
    }

    getState(k){
      return this._context[k];
    }

    setState(k,v){
          this._context[k]=v;
          return v;
        }
    _getContext(){
      return this._context;
    }

    _setContext(context){
      this._context = {
              name:context.name?context.name:"",
              retries: context.retries?context.retries:0,
              payload:context.payload?context.payload:{},
              response:context.response?context.response:{},
              errors:context.error?context.error:{},
      }
    }
}

async function fetchUsers(){

  if(Math.ceil(Math.random()*100)%2==0){
      console.log("calling 1:Success");
    let users = await get('https://jsonplaceholder.typicode.com/users');
    return users;
  }else{
    console.log("calling 1:Failure");
    throw Error("God Bless America")
  }
  
} 



async function fetchTodos (payload){
    if(Math.ceil(Math.random()*100)%2==0){
        console.log("calling 2:Success");
        return await get(`https://jsonplaceholder.typicode.com/todos?userId=${payload.id}`);
    }else{
      console.log("calling 2:Failure");
      throw Error("God Bless America")
    }

}


function pickRandomItem(items){
  return items[Math.floor(Math.random() * items.length)];
}


TaskExecutorConstants = TaskExecutor.constants();
class WorkflowManager{

  constructor(stack){
    this._stack = stack || [];
    this._index = 0;
  }

  async start(){

    for(let i=this._index;i<=this._stack.length;i++){

    
      let apiManager;

      if(i==0){
        apiManager = await this._stack[i].run();
      }else{
        let payload =  await this._stack[i-1].processData();
        apiManager = this._stack[i];
        apiManager.setState(TaskExecutorConstants.PAYLOAD,payload);
        apiManager = await this._stack[i].run();
      }

     
      if(apiManager.getState(TaskExecutorConstants.ERROR)){
          throw new Error(apiManager.getState(TaskExecutorConstants.ERROR))
          console.log(apiManager.getState(TaskExecutorConstants.ERROR))
          // break;
      }

      this._stack[i]= apiManager;
      this._index = this._index+1;
      
    } 

    return true;

  }

  freeze(){
    return {
      wf: {
        index:this._index
      },
      stack: this._stack.map(s => s._getContext()),
    }
  }

  hydrate(context){
    this._index = context.wf.index;
    for(let i=0;i<this._stack.length;i++){
      this._stack[i]._setContext(context.stack[i])
    }
  }

}


let context= null;


let UserManager = new TaskExecutor({}, fetchUsers,pickRandomItem);
let TodoManager = new TaskExecutor({}, fetchTodos);

async function test2(){

  let wf = new WorkflowManager([UserManager,TodoManager]);

  try{
      if(context) wf.hydrate(context)
      let response = await wf.start();
      // if(response) return
  }catch(e){
      context = wf.freeze();
  }

  // console.log(wf._stack[1].getState(ApiManagerConstants.RESPONSE))
}

// test2();

//cron

setInterval(()=>{test2()}, 3000);

