# Projeto de Gerenciamento de Transações com Controle de Concorrência e Deadlock

Lorenzo Bondan e Rafael Andreola

## Descrição do Projeto

Este projeto é uma aplicação Angular que simula um sistema de controle de concorrência de transações em um ambiente de banco de dados. Ele permite gerenciar transações, operações de leitura e escrita, além de simular bloqueios (locks) e identificar situações de deadlock. Cada transação realiza operações em variáveis específicas, e o sistema gerencia o bloqueio e liberação desses recursos, aplicando diferentes estratégias de bloqueio para garantir que as operações de leitura e escrita sejam executadas corretamente.

O projeto utiliza a biblioteca Angular Material para a interface do usuário e está estruturado de maneira que as transações possam ser configuradas e executadas dinamicamente.

## Funcionalidades

1 - Gerenciamento de Transações: A aplicação permite definir múltiplas transações, onde cada uma pode realizar operações de leitura, escrita e commit em variáveis.

2 - Controle de Bloqueios (Locks): As transações adquirem bloqueios exclusivos ou compartilhados em variáveis para impedir que outras transações acessem o mesmo recurso simultaneamente.

3 - Detecção de Deadlock: O sistema identifica situações de deadlock e libera recursos bloqueados para continuar a execução de outras transações.

4 - Histórico de Execução: A aplicação mantém um histórico das ações de cada transação, que inclui operações de leitura, escrita, commit, aquisições de bloqueios e situações de atraso.

## Estrutura de Código

### Importação de Módulos e Componentes

Angular Modules: Importação de módulos principais do Angular, como CommonModule, RouterOutlet, FormsModule, além de componentes de interface do Angular Material como MatCheckboxModule, MatCardModule, MatButtonModule, e MatDividerModule.

## Tipos e Enumerações

* Transaction: Tipo que representa uma transação com propriedades como ID, estado de atraso (delay), estado de finalização (committed), conjunto de bloqueios (locks), e uma lista de passos (steps) que definem as operações de manipulação de dados.

* DataManipulation: Tipo para definir as operações de manipulação de dados, podendo ser de leitura (r), escrita (w) ou commit (c).

* history: Tipo para representar o histórico das transações, armazenando os passos realizados.

* ActionType: Enumeração que define os diferentes tipos de ações e bloqueios utilizados nas transações.

## Componentes e Funções Principais

### onClick()
Função chamada ao iniciar a execução. Seleciona as transações marcadas para execução e organiza o histórico para garantir a ordem correta de operações.

### resetState()
Reseta o estado de execução, limpa o histórico, gerenciador de bloqueios e define que a execução ainda não está completa.

### buildHistory(transactions: Array<Transaction>)
Constrói o histórico de execução a partir dos passos de cada transação. O histórico é ordenado para que cada operação possa ser executada na sequência correta.

### executeTransactions()
Executa as transações com base no histórico. Realiza operações de leitura, escrita, commit e aquisição de bloqueios. Em caso de deadlock, detecta e resolve a situação para permitir a continuidade das operações.

### acquireLock(transaction: Transaction, variable: string, isShared: boolean)
Tenta adquirir um bloqueio (compartilhado ou exclusivo) em uma variável para uma transação específica. Retorna true se a aquisição foi bem-sucedida, false caso contrário.

### releaseLock(variable: string)
Libera o bloqueio em uma variável específica, permitindo que outras transações possam acessá-la.

### cleanDelays(variable: string)
Remove o estado de atraso das transações que aguardavam pelo bloqueio liberado, permitindo que elas retomem a execução.

### handleDeadlock()
Lida com a situação de deadlock, liberando recursos e reconfigurando o estado das transações envolvidas para que outras operações possam continuar.

## Uso do Site

### Configuração de Transações
O usuário pode definir várias transações, marcá-las para execução e especificar operações de leitura (r), escrita (w) e commit (c).

### Execução de Transações 
Ao clicar para iniciar a execução, o sistema seleciona as transações marcadas e organiza a sequência de operações para que sejam executadas na ordem correta.

### Monitoramento de Bloqueios e Deadlocks
O site exibe o status das transações, indicando quando um bloqueio foi adquirido, liberado, ou quando ocorre uma situação de deadlock.

### Histórico de Execução
O histórico de ações é atualizado em tempo real, permitindo ao usuário acompanhar o progresso das operações.

## Tecnologias e Bibliotecas

* Angular: Framework principal para a construção da aplicação.

* Angular Material: Biblioteca de componentes para a interface do usuário.

* TypeScript: Linguagem usada para o desenvolvimento do código do projeto.

## Explicação dos Métodos

* onClick(): Inicia o processo de execução das transações.

* resetState(): Reseta o estado e histórico de execução.

* buildHistory(): Constrói a sequência de operações de cada transação.

* executeTransactions(): Executa as operações das transações com base no histórico.

* acquireLock(): Adquire um bloqueio para uma variável específica.

* releaseLock(): Libera o bloqueio de uma variável.

* cleanDelays(): Remove atrasos de transações quando o bloqueio é liberado.

* handleDeadlock(): Lida com deadlocks, liberando recursos para continuidade das operações.