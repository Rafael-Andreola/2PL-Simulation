// importação de módulos e componentes do Angular
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms'

// definição de tipo para uma transação com suas propriedades e operações
type Transaction = {
  id: number; // Identificador da transação
  delay: boolean; // Flag para indicar atraso na transação
  committed: boolean; // Flag para indicar se a transação foi finalizada
  locks: Set<string>; // Conjunto de variáveis bloqueadas pela transação
  steps: Array<DataManipulation>; // Passos de manipulação de dados a serem executados
  selected: boolean; // Indica se a transação foi selecionada
};
 
// Definição de tipo para manipulação de dados
type DataManipulation = {
  what: "r" | "w" | "c"; // Tipo de operação: leitura (r), escrita (w) ou commit (c)
  variable?: string; // Variável alvo da operação (opcional)
  executed?: boolean; // Flag para indicar se o passo foi executado
}

// Definição de tipo para histórico de transações
type history = {
  step: Array<Record<number, DataManipulation>>; // Lista de passos realizados com o ID da transação e a manipulação de dados
}

// Enum para diferentes tipos de ações e bloqueios
enum ActionType {
  AcquireSharedLock = 'ls', // Adquirir bloqueio compartilhado
  AcquireExclusiveLock = 'lx', // Adquirir bloqueio exclusivo
  AcquireExclusiveLockUpgrade = 'ls->lx', // Atualizar bloqueio compartilhado para exclusivo
  ReleaseSharedLock = 'us', // Liberar bloqueio compartilhado
  ReleaseExclusiveLock = 'ux', // Liberar bloqueio exclusivo
  Delay = 'Delay', // Atraso
  Commit = 'c', // Commit da transação
  Abort = 'Abort', // Cancelamento da transação
  DeadLock = 'DeadLock', // Deadlock detectado
  Read = 'r', // Leitura de uma variável
  Write = 'w', // Escrita em uma variável
}

// Decorador que define o componente e suas propriedades
@Component({
  selector: 'app-root', // Seletor para uso do componente no HTML
  standalone: true, // Define o componente como autônomo
  imports: [CommonModule, RouterOutlet, MatCheckboxModule, FormsModule, MatCardModule,MatButtonModule, MatDividerModule],
  templateUrl: './app.component.html', // Caminho do template HTML
  styleUrls: ['./app.component.scss'] // Caminho do estilo CSS
})
export class AppComponent {

  // Inicialização de variáveis e estruturas de dados
  initialHistory : history = { step: [] }; // Histórico inicial das transações
  lockManager: { [variable: string]: { transactionId: number; isShared: boolean } } = {};
  executionHistory: Array<{ transactionId: number; action: ActionType; variable?: string }> = [];
  allExecuted: boolean = false; // Indica se todas as transações foram executadas
  
  // Lista de transações para simulação com passos de manipulação de dados
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

  transactionsSelected : Array<Transaction> = [] // Lista de transações selecionadas para execução

  // Função que é chamada ao clicar para iniciar a execução
  onClick(){
    this.transactionsSelected = [] // Reseta a seleção de transações

    // Seleciona as transações marcadas para execução e cria uma cópia delas
    this.transactionsSelected = JSON.parse(JSON.stringify(this.transactions.filter(t => t.selected)))
    this.transactionsSelected.forEach(t => t.locks = new Set()) // Inicializa o conjunto de bloqueios
    if (this.transactionsSelected.length > 0) {
      this.buildHistory(this.transactionsSelected) // Constrói o histórico de execução
    }
  }

  // Função para resetar o estado de execução
  resetState() {
    this.executionHistory = []; // Reseta o histórico de execução
    this.lockManager = {}; // Limpa o gerenciador de bloqueios
    this.allExecuted = false; // Define que a execução não está completa
    this.initialHistory = { step: [] }; // Reseta o histórico inicial
  }
 
  // Função que constrói o histórico das transações e organiza os passos para execução
  buildHistory(transactions: Array<Transaction>) {   
    this.resetState();

    let i = -1
    let timesIterate = 0
    const maxI = transactions.length - 1 
    const maxSteps = transactions.reduce((sum, t) => sum + t.steps.length, 0); // Conta total de passos

    // Loop para organizar o histórico dos passos em uma sequência ordenada para execução
    do {
      i < maxI ? i++ : i = 0;
      
      const step = transactions[i].steps.shift()

      if (step){

        this.initialHistory.step.push({[transactions[i].id]: step}); // Adiciona o passo ao histórico

        if (transactions[i].steps.length === 1){ // Se houver apenas um passo remanescente (commit)
          const commit = transactions[i].steps.shift()
          if (commit){
            this.initialHistory.step.push({[transactions[i].id]: commit}); // Adiciona o commit ao histórico
            timesIterate++; 
          }
        }

      } else{
        continue;
      }       

      timesIterate++; // Incrementa o contador de iterações           

    } while(timesIterate < maxSteps);

    this.executeTransactions(); // Inicia a execução das transações com base no histórico
  }

  // Função que executa as transações com base no histórico construído
  executeTransactions() {    
    this.initialHistory.step.forEach((stepRecord) => {     

      const transactionId = <number><unknown>Object.keys(stepRecord)[0]; // Obtém o ID da transação
      const step = stepRecord[transactionId]; // Obtém o passo da transação

      if(!step.executed){
        const transaction = this.transactionsSelected.find((t) => t.id === +transactionId);

        if (transaction) {          
          if(!transaction.delay){
            if (step.what === 'r' || step.what === 'w') {
              // Tenta adquirir bloqueio
              if (!this.acquireLock(transaction, <string>step.variable, step.what === 'r')) {
                // A transação está em atraso (não conseguiu adquirir o bloqueio)
                this.executionHistory.push({
                  transactionId: transaction.id,
                  action: ActionType.Delay,
                  variable: step.variable,
                });
                transaction.delay = true
  
              }else {
                stepRecord[transactionId].executed = true // Marca o passo como executado
              }
            } else if (step.what === 'c') {
              // Libera todos os bloqueios após o commit
              this.executionHistory.push({
                transactionId: transaction.id,
                action: ActionType.Commit,
              });
  
              transaction.locks.forEach((variable) => {
                this.releaseLock(variable); // Libera o bloqueio de cada variável bloqueada
                this.cleanDelays(variable); // Limpa os atrasos de outras transações para essa variável
              });

              transaction.locks = new Set(); // Reseta o conjunto de bloqueios
              transaction.committed = true // Marca a transação como finalizada
              transaction.delay = false // Define que não está mais em atraso
              stepRecord[transactionId].executed = true // Marca o commit como executado
  
              this.executeTransactions(); // Continua a execução das próximas transações
            }
          } else {            
            if(this.transactionsSelected.filter(tr => !tr.committed).every(t => t.delay)){
              // Detecção de deadlock
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

    this.allExecuted = true; // Marca que todas as transações foram executadas
  }

  // Função para remover o atraso de transações que aguardam pelo bloqueio liberado
  cleanDelays(variable : string){
    this.initialHistory.step.forEach((stepRecord) => {   
      
      const transactionId = <number><unknown>Object.keys(stepRecord)[0];
      const step = stepRecord[transactionId];
      
      if (!step.executed && step.variable === variable) {
        const transaction = this.transactionsSelected.find((t) => t.id === +transactionId && t.delay)
        transaction ? transaction.delay = false : null; // Remove o atraso da transação
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

  // Função para tentar adquirir um bloqueio para a transação
  acquireLock(transaction: Transaction, variable: string, isShared: boolean = false): boolean {
    const currentLock = this.lockManager[variable];

    if (!currentLock) {
      // Se não houver bloqueio, adquire um
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
      // Se já possui bloqueio compartilhado e precisa de exclusivo, faz o upgrade
      if (!isShared && currentLock.isShared) {
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

    // Retorna false se não conseguiu o bloqueio (bloqueio já em uso por outra transação)
    return false;
  }

  // Função para liberar um bloqueio
  releaseLock(variable: string): void {
    //depois do commit, libera todos bloqueios associados a transação em questao
    this.executionHistory.push({
      transactionId: this.lockManager[variable].transactionId,
      action: this.lockManager[variable].isShared ? ActionType.ReleaseSharedLock : ActionType.ReleaseExclusiveLock,
      variable,
    });
    delete this.lockManager[variable]; // Remove o bloqueio da variável
  }

  // função usada no HTML para mostrar o histórico inicial
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

  // função usada no HTML para mostrar o histórico final
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

