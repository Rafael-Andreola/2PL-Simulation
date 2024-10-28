import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms'

type Transaction = {
  id: number;
  delay: boolean;
  committed: boolean;
  locks: Set<string>;
  steps: Array<DataManipulation>;
  selected: boolean;
};
 
type DataManipulation = {
  what: "r" | "w" | "c";
  variable?: string;
  executed?: boolean;
}

type history = {
  step: Array<Record<number, DataManipulation>>;
}

enum ActionType {
  AcquireSharedLock = 'ls',
  AcquireExclusiveLock = 'lx',
  AcquireExclusiveLockUpgrade = 'ls->lx',
  ReleaseSharedLock = 'us',
  ReleaseExclusiveLock = 'ux',
  Delay = 'Delay',
  Commit = 'c',
  Abort = 'Abort',
  DeadLock = 'DeadLock',
  Read = 'r',
  Write = 'w',
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatCheckboxModule, FormsModule, MatCardModule,MatButtonModule, MatDividerModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  initialHistory : history = { step: [] };
  lockManager: { [variable: string]: { transactionId: number; isShared: boolean } } = {};
  executionHistory: Array<{ transactionId: number; action: ActionType; variable?: string }> = [];
  allExecuted: boolean = false;
  
  transactions: Array<Transaction> = [
     {
      id: 1,
      delay: false,
      committed: false,
      locks: new Set(),
      steps: [
        { variable: "x", what: 'w' },
        { variable: "y", what: 'w' },
        { what: 'c' },
      ],
      selected: false
    },  
    {
      id: 2,
      delay: false,
      committed: false,
      locks: new Set(),
      steps: [
        { variable: "x", what: 'r' },
        { variable: "x", what: 'w' },
        { what: 'c' },
      ],
      selected: false
    },  
    {
      id: 3,
      delay: false,
      committed: false,
      locks: new Set(),
      steps: [
        { variable: "y", what: 'r' },
        { variable: "y", what: 'r' },
        { what: 'c' },
      ],
      selected: false
    },
    {
      id: 4,
      delay: false,
      committed: false,
      locks: new Set(),
      steps: [
        { variable: "y", what: 'w' },
        { variable: "x", what: 'r' },
        { what: 'c' },
      ],
      selected: false
    }
  ]

  transactionsSelected : Array<Transaction> = []

  onClick(){
    this.transactionsSelected = []

    this.transactionsSelected = JSON.parse(JSON.stringify(this.transactions.filter(t => t.selected)))
    this.transactionsSelected.forEach(t => t.locks = new Set())
    if (this.transactionsSelected.length > 0) {
      this.buildHistory(this.transactionsSelected)
    }
    
  }

  resetState() {
    this.executionHistory = [];
    this.lockManager = {};
    this.allExecuted = false;
    this.initialHistory = { step: [] }; 
  }
 
  buildHistory(transactions: Array<Transaction>) {   
    this.resetState();

    let i = -1
    let timesIterate = 0
    const maxI = transactions.length - 1
    const maxSteps = transactions.reduce((sum, t) => sum + t.steps.length, 0);

    do{
      i < maxI ? i++ : i = 0;
      
      const step = transactions[i].steps.shift()

      if (step){

        this.initialHistory.step.push({[transactions[i].id]: step});

        if (transactions[i].steps.length === 1){
          const commit = transactions[i].steps.shift()
          if (commit){
            this.initialHistory.step.push({[transactions[i].id]: commit});
            timesIterate++;
          }
        }

      }else{
        continue;
      }       

      timesIterate++;           

    }while(timesIterate < maxSteps);

    this.executeTransactions();
  }

  executeTransactions() {    
    this.initialHistory.step.forEach((stepRecord) => {     

      const transactionId = <number><unknown>Object.keys(stepRecord)[0];
      const step = stepRecord[transactionId];

      if(!step.executed){
        const transaction = this.transactionsSelected.find((t) => t.id === +transactionId);

        if (transaction) {          
          if(!transaction.delay){
            if (step.what === 'r' || step.what === 'w') {
              // Tenta adquirir bloqueio
              if (!this.acquireLock(transaction, <string>step.variable, step.what === 'r')) {
                // esta em delay
                this.executionHistory.push({
                  transactionId: transaction.id,
                  action: ActionType.Delay,
                  variable: step.variable,
                });
                transaction.delay = true
  
              }else {
                stepRecord[transactionId].executed = true
              }
            } else if (step.what === 'c') {
              // libera os bloqueios

              this.executionHistory.push({
                transactionId: transaction.id,
                action: ActionType.Commit,
              });
  
              transaction.locks.forEach((variable) => {
                this.releaseLock(variable);
                this.cleanDelays(variable);
              });
              transaction.locks = new Set();
  
              
              transaction.committed = true
              transaction.delay = false
              stepRecord[transactionId].executed = true
  
              this.executeTransactions();
  
            }
          }else {            
            if(this.transactionsSelected.filter(tr => !tr.committed).every(t => t.delay)){
             
              this.handleDeadlock();
              this.executionHistory.push({
                transactionId: transaction.id,
                action: ActionType.DeadLock
              });
              this.executeTransactions();
              
            }
          }
          
        }
      }
      
    });

    this.allExecuted = true;
    
  }

  cleanDelays(variable : string){
    this.initialHistory.step.forEach((stepRecord) => {   
      
      const transactionId = <number><unknown>Object.keys(stepRecord)[0];
      const step = stepRecord[transactionId];
      
      if (!step.executed && step.variable === variable) {
        const transaction = this.transactionsSelected.find((t) => t.id === +transactionId && t.delay)
       
        transaction ? transaction.delay = false : null;  

      }
    })
  }

  handleDeadlock(){
    let retryCommited = this.transactionsSelected.filter(t => !t.committed && t.delay)[0];
    let unCommittedTransactions = this.transactionsSelected.filter(t => !t.committed && t.delay);
    unCommittedTransactions.shift()

    this.initialHistory.step.forEach((stepRecord) => {     

      const transactionId = <number><unknown>Object.keys(stepRecord)[0];

      unCommittedTransactions.forEach(uT => {
        this.executionHistory = this.executionHistory.filter(eH => eH.transactionId != uT.id)
        
        if(uT.id === transactionId){
          const step = stepRecord[transactionId];
          step.executed = false
        }

        uT.locks.forEach(variable => {
          this.releaseLock(variable)
        })
                
        uT.delay = true;
        uT.locks = new Set();
      })

    })
   
    retryCommited.delay = false

  }

  acquireLock(transaction: Transaction, variable: string, isShared: boolean = false): boolean {
    const currentLock = this.lockManager[variable];

    if (!currentLock) {
      // nao existe bloqueio, entao cria um novo
      this.lockManager[variable] = { transactionId: transaction.id, isShared };
      transaction.locks.add(variable);
      const actionType = isShared ? ActionType.AcquireSharedLock : ActionType.AcquireExclusiveLock;
      this.executionHistory.push({
        transactionId: transaction.id,
        action: actionType,
        variable,
      });
      this.executionHistory.push({
        transactionId: transaction.id,
        action: isShared ? ActionType.Read : ActionType.Write,
        variable,
      });
      return true;
    }

    if (currentLock.transactionId === transaction.id) {
      // a transacao que quer o bloqueio ja possui sobre aquela variavel

      if (!isShared && currentLock.isShared) {
        // se o bloqueio for compartilhado e a transação precisa de um upgrade se ela for a unica com o bloqueio

        const sharedLocks = Object.values(this.lockManager).filter(
          (lock) => lock && lock.isShared && lock.transactionId === transaction.id
        );
        if (sharedLocks.length === 1) {
          this.lockManager[variable] = { transactionId: transaction.id, isShared: false };
          transaction.locks.add(variable);
          this.executionHistory.push({
            transactionId: transaction.id,
            action: ActionType.AcquireExclusiveLockUpgrade,
            variable,
          });
        }
      }

      this.executionHistory.push({
        transactionId: transaction.id,
        action: isShared ? ActionType.Read : ActionType.Write,
        variable,
      });
      
      return true;
      
    }

    // Outra transação ja possui o bloqueio
    return false;
  }

  releaseLock(variable: string): void {
    //depois do commit, libera todos bloqueios associados a transação em questao
    this.executionHistory.push({
      transactionId: this.lockManager[variable].transactionId,
      action: this.lockManager[variable].isShared ? ActionType.ReleaseSharedLock : ActionType.ReleaseExclusiveLock,
      variable,
    });
    delete this.lockManager[variable];
    
  }

  getInitialHistory(){
    let strHistory : string = "";

    if(this.initialHistory){

      this.initialHistory.step.forEach((step) => {
        const stepV = Object.values(step)[0] as DataManipulation;
        const stepK = Object.keys(step)[0] as unknown as number;
        strHistory += `${stepV.what}${stepK}`;
        if (stepV.what !== 'c'){
          strHistory += `[${stepV.variable}]`
        }

        strHistory += " - "

      });


    }
    return strHistory.substring(0, strHistory.length - 3)

  }

  getTransactionStr(transaction : Transaction){
       
    let stpStr : string = "";

    transaction.steps.forEach(step => {
      stpStr += `${step.what}${transaction.id}`
      if (step.what != 'c') {
        stpStr += `[${step.variable}] `
      }
    })

    return stpStr


  }

  getFinalHistory(){
    let strHistoryFinal : string = "";

    const getHaveBrackets = (at : ActionType) => {
      return [
        ActionType.AcquireExclusiveLock, 
        ActionType.AcquireExclusiveLockUpgrade, 
        ActionType.ReleaseExclusiveLock, 
        ActionType.ReleaseSharedLock,
        ActionType.AcquireSharedLock,
        ActionType.Write,
        ActionType.Read      
      ].includes(at)
    }

    this.executionHistory.forEach(step => {
      strHistoryFinal += `${step.action}${step.transactionId}` 
      if (getHaveBrackets(step.action)) {
        strHistoryFinal += `[${step.variable}]`
      }

      strHistoryFinal += " - "

    })

    return strHistoryFinal.substring(0, strHistoryFinal.length - 3);

  }

}

