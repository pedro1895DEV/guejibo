let passo_nave = 0.75;
let limite_movimento = 7;
let passo_obstaculos = 1;
let velocidade_obstaculos = 10; // menos é mais
let qtde_inicial_obstaculos = 10;
let passo_laser = 30 + Math.PI;
let pode_atirar = true;
let limite_tiro = 25;
let valor_retorno = 5;
let min_left_aleatorio = 0;
let max_left_aleatorio = 100;
let obst_fim = 0;
let obst_dest = 0;
let tiros_dados = 0;
let tiros_errados = 0;
let fim_jogo = false;
let qtde_movimento = 25;
let qtde_maxima_obstaculos = 25;
let iniciou = false;
let parar = false;
let objetivos_concluidos = 0;
let modo_hard = false;
let quantidade_para_hard = 10;

let respostas_corretas = 0;
let respostas_incorretas = 0;
let tiros_alternativas = 0;
let pontuacao = 0;
let aliens_eliminados = 0;
let melhor_tempo = 999;
let planetas_destruidos = 0;
let acuracia_tiro = 0;

let tempo_inicial = 9;
let tempo_hard = 4;
let tempo_restante = tempo_inicial;
let t;

$('#tempo').text(tempo_inicial + 1);

let acoes_nave = {
	'moveu_esquerda':false,
	'moveu_direita':false,
	'atirou':false
};

function aleatorio(min, max) {

	// Gera um número aleatório entre o mínimo e o máximo, estando eles inclusos

	 min = Math.ceil(min);
	 max = Math.floor(max);

	 return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Q&A

let perguntas = ['Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantis', 'Distrito Federal'];

let imagens = ['ac.jpg', 'al.jpg', 'ap.jpg', 'am.jpg', 'ba.jpg', 'ce.jpg', 'es.jpg', 'go.jpg', 'ma.jpg', 'mt.jpg', 'ms.jpg', 'mg.jpg', 'pa.jpg', 'pb.jpg', 'pr.jpg', 'pe.jpg', 'pi.jpg', 'rj.jpg', 'rn.jpg', 'rs.jpg', 'ro.jpg', 'rr.jpg', 'sc.jpg', 'sp.jpg', 'se.jpg', 'to.jpg', 'df.jpg'];

let respostas = ['Rio Branco', 'Maceió', 'Macapá', 'Manaus', 'Salvador', 'Fortaleza', 'Vitória', 'Goiânia', 'São Luís', 'Cuiabá', 'Campo Grande', 'Belo Horizonte', 'Belém', 'João Pessoa', 'Curitiba', 'Recife', 'Teresina', 'Rio de Janeiro', 'Natal', 'Porto Alegre', 'Porto Velho', 'Boa Vista', 'Florianópolis', 'São Paulo', 'Aracaju', 'Palmas', 'Brasília'];

let pergunta_sorteada;
let resposta;
let posicao_resposta;
let qtde_alternativas = 5;
let $a;

function cria_questao() {

	let alternativas_inseridas;
	$('#alternativas').empty();
	pergunta_sorteada = aleatorio(0, perguntas.length - 1);
	$('#pergunta').text(perguntas[pergunta_sorteada]);
	$('#imagem').attr('src', `img/estados_brasileiros/${imagens[pergunta_sorteada]}`);
	resposta = pergunta_sorteada;
	posicao_resposta = aleatorio(0, 4);
	alternativas_inseridas = [resposta];

	for (let i = 0; i < qtde_alternativas; i++) {

		if (i == posicao_resposta) {
			$('#alternativas').append($(`<div class="alt"><span class="alternativa">${respostas[resposta]}</span></div>`));
		} else {

			let fim = true;
			let r;

			do {

				r = aleatorio(0, respostas.length - 1);

			} while(r == resposta);

			$a = $(`<div class="alt"><span class="alternativa">${respostas[r]}</span></div>`);
			$('#alternativas').append($a);
		}
	}


	if (modo_hard) {
		tempo_restante = 5;
	} else {
		tempo_restante = 10;
	}

}

cria_questao();

function atira () {

	$('#laser').css('top', `-=${passo_laser}`);

	for (let i = 0; i < $(`.alt`).length; i++) {
		atira_alt($(`.alt`).eq(i))
	}

	for (let i = 0; i < $('.planeta').length; i++) {
		atira_planeta($('.planeta').eq(i));
	}

	for (let i = 0; i < $(`.alien`).length; i++) {
		atira_alien($(`.alien`).eq(i));
	}

	let tiro = window.requestAnimationFrame(atira);

	if ($('#laser').offset().top < 25) {

		window.cancelAnimationFrame(tiro);
		$('#laser').hide();
		$('#laser').css('top', '0px');

	}

}

function cria_obstaculos_a(quantidade) {

	// Esta função cria os obstáculos do jogo. Todos eles são gerados em posições aleatórias. O top é definido negativamente, para que eles levem um tempo para chegar ao usuário.

	for (let i = 0; i < quantidade; i++) {

		let $obstaculo = $(`<div class="obstaculo"></div>`);
		// $($obstaculo).css('position', 'absolute');

		let left = aleatorio(min_left_aleatorio, max_left_aleatorio);
		let top = aleatorio(7, 50);

		let r = aleatorio(0, 2);

		if (r == 0 || r == 1) {
			$($obstaculo).css('border-radius', '50%');
			$($obstaculo).css('background-image', `linear-gradient(#${aleatorio(100, 999)}, #${aleatorio(100, 999)})`);
			$obstaculo.addClass('planeta');
		} else {
			$($obstaculo).css('background-image', `url('img/alien.png')`);
			$obstaculo.addClass('alien');
		}

		$($obstaculo).css('top', `${top}%`);
		$($obstaculo).css('left', `${left}%`);

		$('#espaco_obstaculos_a').append($obstaculo);
	}

}

function cria_obstaculos_b(quantidade) {
	for (let i = 0; i < quantidade; i++) {

		let $obstaculo = $(`<div class="obstaculo"></div>`);
		// $($obstaculo).css('position', 'absolute');

		let left = aleatorio(min_left_aleatorio, max_left_aleatorio);
		let top = aleatorio(7, 50);

		let r = aleatorio(0, 1);

		if (r == 0) {
			$($obstaculo).css('border-radius', '50%');
			$($obstaculo).css('background-image', `linear-gradient(#${aleatorio(100, 999)}, #${aleatorio(100, 999)})`);
			$obstaculo.addClass('planeta');
		} else {
			$($obstaculo).css('background-image', `url('img/alien.png')`);
			$obstaculo.addClass('alien');
		}

		$($obstaculo).css('top', `${top}%`);
		$($obstaculo).css('left', `${left}%`);

		$('#espaco_obstaculos_b').append($obstaculo);
	}

}

// cria_obstaculos_a(qtde_inicial_obstaculos);
// cria_obstaculos_b(qtde_inicial_obstaculos);

// window.addEventListener('resize', function() {
// 	$('#espaco').css('width', `${window.innerWidth}px`);
// 	$('#espaco').css('height', `${window.innerHeight}px`);

// 	$('#espaco_obstaculos_a').css('width', `${window.innerWidth}px`);
// 	$('#espaco_obstaculos_b').css('width', `${window.innerWidth}px`);
	
// });

let y = false;

function atualiza () {

	let c = 0;

	// verifica_formacao_binaria()
	verifica_limite_espaco();
    
    // Aqui as ondas se iniciam
    if ($('#espaco_obstaculos_b').children().length == 0) {
    	$('#espaco_obstaculos_b').css('left', '75%');
    	cria_obstaculos_b(qtde_inicial_obstaculos);
    }

    if ($('#espaco_obstaculos_a').children().length == 0) {
    	$('#espaco_obstaculos_a').css('left', '-75%');
    	cria_obstaculos_a(qtde_inicial_obstaculos);
    }

	$('#espaco_obstaculos_a').css('left', `+=${passo_obstaculos}`);
	$('#espaco_obstaculos_b').css('left', `-=${passo_obstaculos}`);

	let obst_a = $('#espaco_obstaculos_a').children();
	let obst_b = $('#espaco_obstaculos_b').children();

	for (let i = 0; i < $('#espaco_obstaculos_a').children().length; i++) {
		// Se o obstáculo chegou ao fim do espaço, ele fica escondido e recebe uma classe de chegou ao fim
		if ($(obst_a[i]).offset().left > $('#espaco').width() - 50) {
			$(obst_a[i]).remove();
			obst_fim++
		}
	}


	for (let i = 0; i < $('#espaco_obstaculos_b').children().length; i++) {
		// Se o obstáculo chegou ao fim do espaço, ele fica escondido e recebe uma classe de chegou ao fim
		if ($(obst_b[i]).offset().left < 50) {
			$(obst_b[i]).remove();
			obst_fim++
		}
	}

	if (acoes_nave['moveu_direita']) {

		while (acoes_nave['moveu_direita']) {
			$('#nave').css('left', `+=${passo_nave}`);
			if (c == limite_movimento) {
				break;
				acoes_nave['moveu_direita'] = false;
			}
			c++;
		}
	}

	if (acoes_nave['moveu_esquerda']) {
		
		while (acoes_nave['moveu_esquerda']) {
			$('#nave').css('left', `-=${passo_nave}`);
			if (c == limite_movimento) {
				break;
				acoes_nave['moveu_esquerda'] = false;
			}
			c++;
		}
	}

	if (acoes_nave['atirou']) {
		
		if (acoes_nave['atirou']) {
			acoes_nave['atirou'] = false;
			$('#laser').show();
			atira();
		}
	}

	let intervalo_func = setTimeout(atualiza, velocidade_obstaculos);

	if (parar) {
		clearTimeout(intervalo_func);
	}
}

function atira_alt(alternativa) {

	let top_laser = $('#laser').offset().top;
	let left_laser = $('#laser').offset().left;

	let top_alternativa = $(alternativa).offset().top;
	let left_alternativa = $(alternativa).offset().left;

	let height_alternativa = $(alternativa).height();
	let width_alternativa = $(alternativa).width();

	let acertou;

	if (top_laser < top_alternativa && top_laser > top_alternativa - height_alternativa) {
		if (left_laser > left_alternativa && left_laser < left_alternativa + width_alternativa) {

			$('#laser').hide();
			$('#laser').css('top', '0px');

			tiros_alternativas++;


			if ($(alternativa).find('.alternativa').text() == respostas[resposta]) {
				pontuacao++;
				respostas_corretas++;

				if (10 - tempo_restante < melhor_tempo) {
					melhor_tempo = 10 - tempo_restante;
				}

				$('#pontuacao').text(pontuacao);
				$(alternativa).css('box-shadow', '1px 1px 50px lightgreen');
				toast('Certa resposta! +1 ponto');
				acertou = true;

			} else {
				pontuacao--;
				respostas_incorretas++;
				$('#pontuacao').text(pontuacao);
				$(alternativa).css('box-shadow', '1px 1px 50px tomato');
				toast('Opa, errou! -1 ponto', 'tomato');
			}

			setTimeout(() => {
				$(alternativa).css('box-shadow', 'none');

				if (acertou) {
					cria_questao();
				}

			}, 250);
		}
	}

}

function atira_planeta(planeta) {

	// Se o "laser", que nada mais é do que uma div cujo top é modificado para simular movimento, entra na região crítica de um obstáculo, o obstáculo é escondido e recebe a classe "obstaculo_destruido", para ser apagado no final.

	let top_laser = $('#laser').offset().top;
	let left_laser = $('#laser').offset().left;

	let top_planeta = $(planeta).offset().top;
	let left_planeta = $(planeta).offset().left;

	let height_planeta = $(planeta).height();
	let width_planeta = $(planeta).width();

	// O top do laser diminui progressivamente, porque está subindo
	// O top do bloco aumenta progressivamente, porque está descendo

	// Se o top do bloco é 500, o top do laser tem que ser menor do que isso, para ultrapassar o bloco. Porém, o top do laser precisa ser maior do que o top do bloco menos o height do bloco. Ou seja, precisa ultrapassar a parte de baixo do bloco.

	if (top_laser > 0 && left_laser > 0) {
		if (top_laser < top_planeta && top_laser > top_planeta - height_planeta) {
			if (left_laser > left_planeta && left_laser < left_planeta + width_planeta) {

				$('#laser').hide();
				$('#laser').css('top', '0px');

				$(planeta).css('background-image', 'linear-gradient(green, yellow)').css('box-shadow', '1px 1px 50px darkblue');

				planetas_destruidos++;

				setTimeout(() => {
					$(planeta).fadeOut('600');
				}, 25);

				setTimeout(() => {
					$(planeta).remove();
					
					pontuacao--;

					toast('-1 ponto', '#CD5C5C', 500);
					$('#pontuacao').text(pontuacao);
				}, 500);


			}
		}
	}

}

function atira_alien(alien) {

	let top_laser = $('#laser').offset().top;
	let left_laser = $('#laser').offset().left;

	let top_alien = $(alien).offset().top;
	let left_alien = $(alien).offset().left;

	let height_alien = $(alien).height();
	let width_alien = $(alien).width();

	if (top_laser > 0 && left_laser > 0) {
		if (top_laser < top_alien && top_laser > top_alien - height_alien) {
			if (left_laser > left_alien && left_laser < left_alien + width_alien) {

				$('#laser').hide();
				$('#laser').css('top', '0px');

				$(alien).css('background-image', 'linear-gradient(red, tomato)').css('box-shadow', '1px 1px 50px orange');
				setTimeout(() => {
					$(alien).fadeOut('600');
				}, 25);

				setTimeout(() => {
					$(alien).remove();
					
					aliens_eliminados++;
					
					pontuacao++;
					toast('+1 ponto', '#3CB371', 500);

					$('#tempo').text(tempo_restante);
					$('#pontuacao').text(pontuacao);
				}, 500);	

			}
		}
	}

}

// function verifica_formacao_binaria() {

// 	let formacao_binaria = '';

// 	for (let i = 0; i < $('.alt').length; i++) {

// 		formacao_binaria += $('.alt').eq(i).find('.valor_binario').text();

// 	}

// 	formacao_binaria = parseInt(formacao_binaria, 2);

// 	$('#numero_atual').text(formacao_binaria);

// 	if (formacao_binaria == $('#numero_objetivo').text()) {

// 		if (modo_hard) {

// 			if (30 - tempo_restante < melhor_tempo) {
// 				melhor_tempo = 60 - tempo_restante;
// 			}

// 		} else {

// 			if (60 - tempo_restante < melhor_tempo) {
// 				melhor_tempo = 60 - tempo_restante;
// 			}

// 		}

// 		numeros_formados++;

// 		objetivos_concluidos++;
// 		$('#numero_objetivo').text(aleatorio(0, 255));

// 		if (objetivos_concluidos >= quantidade_para_hard) {
			
// 			if (!modo_hard && objetivos_concluidos == quantidade_para_hard) {
// 				toast('Você alcançou o modo hard! O tempo agora está mais curto!', 'purple', 3000);
// 				modo_hard = true;
// 			}

// 			$('#tempo').text(tempo_hard + 1);
// 			tempo_restante = tempo_hard;
// 			pontuacao += 10;
// 			$('#pontuacao').text(pontuacao);

// 			if (objetivos_concluidos > quantidade_para_hard) {
// 				toast('Certa resposta! +10 pontos', 'purple', 2000);
// 			}

// 		} else {
// 			$('#tempo').text(tempo_inicial + 1);
// 			tempo_restante = tempo_inicial;
// 			pontuacao += 5;
// 			$('#pontuacao').text(pontuacao);
// 			toast('Certa resposta! +5 pontos', 'green', 2000);
// 		}

// 	 	clearTimeout(t);
// 		temporizador();

// 		return true;
// 	}

// }

function verifica_limite_espaco() {

	// Esta função serve para evitar a nave de sair do espaço delimitado. Quando ele atinge o limite à direta, por exemplo, ela surge no início da esquerda.

	let top_espaco = $('#espaco').offset().top;
	let left_espaco = $('#espaco').offset().left;
	
	let height_espaco = $('#espaco').height();
	let width_espaco = $('#espaco').width();

	let top_nave = $('#nave').offset().top;
	let left_nave = $('#nave').offset().left;
	
	let height_nave = $('#nave').height();
	let width_nave = $('#nave').width();

	// direita
	if (left_nave > width_espaco - width_nave) {
		$('#nave').css('left', `${10}px`);
	}

	// esquerda
	if (left_nave < left_espaco) {
		$('#nave').css('left', `${width_espaco - width_nave}px`);
	}

}

function gameover() {

	// Contadores

	$('#pontuacao_obtida').text(`Pontuação obtida: ${pontuacao}`);

	if (melhor_tempo == 999) {
		melhor_tempo = 0;
	}

	$('#melhor_tempo').text(`Melhor tempo: ${melhor_tempo} segundo(s)`);

	let tiros_certos = (aliens_eliminados + tiros_alternativas) - respostas_incorretas;
	acuracia_tiro = ((tiros_certos / tiros_dados) * 100).toFixed(2) + '%';
	
	$('#respostas_corretas').text(`Respostas corretas: ${respostas_corretas}`);
	$('#respostas_incorretas').text(`Respostas incorretas: ${respostas_incorretas}`);
	$('#tiros_alternativas').text(`Tiros em alternativas: ${tiros_alternativas}`);
	$('#tiros_dados').text(`Tiros dados: ${tiros_dados}`);
	$('#acuracia_tiro').text(`Acurácia do tiro: ${acuracia_tiro}`);
	$('#planetas_destruidos').text(`Planetas destruidos: ${planetas_destruidos}`);
	$(`#aliens_eliminados`).text(`Aliens eliminados: ${aliens_eliminados}`)
	$('#resposta_correta').text(`A resposta correta era: ${respostas[resposta]}`);

	$('#bg_game_over').fadeIn('2000');
	$('.obstaculo').remove();
	fim_jogo = true;
	parar = true;
	clearTimeout(t);
}

$('#btn_jogar_novamente').click(() => {
	window.location.reload();
});

function temporizador() {

  t = setTimeout(function() {
    
  	if (tempo_restante > 0) {
  		$('#tempo').text(tempo_restante--);
  	} else {
  		gameover();
  	}

    if(tempo_restante >= 0) {
      temporizador();
    }
  }, 1000);

}

// CENTRO DE AÇÕES

$('body').keydown(function(event) {

	let tecla = event.keyCode;

	if(tecla == 39 || tecla == 68) {
		 // seta pra DIREITA ou D
		 acoes_nave['moveu_direita'] = true;
	}

	if(tecla == 37 || tecla == 65) {
		 // seta pra ESQUERDA ou A
		 acoes_nave['moveu_esquerda'] = true;
	}

	if (tecla == 32) {
		// espaço
		tiros_dados++;
		acoes_nave['atirou'] = true;
	}

});

let toggle = true;

$('body').keyup(function(event) {

	let tecla = event.keyCode;



	if(tecla == 80 && iniciou) {
		 // Pause
		 $('#bg_pause').toggle();
		 if (toggle) {
		 	 toggle = false;
			 parar = true;
			 clearTimeout(t);
		 } else {
		 	toggle = true;
			parar = false;
			atualiza();
			temporizador();		 	
		 }

	}	

	if(tecla == 39 || tecla == 68) {
		 // seta pra DIREITA ou D
		 acoes_nave['moveu_direita'] = false;
	}

	if(tecla == 37 || tecla == 65) {
		 // seta pra ESQUERDA ou A
		 acoes_nave['moveu_esquerda'] = false;
	}

	// if (tecla == 32) {
	// 	// espaço
	// 	acoes_nave['atirou'] = false;
	// 	$('#laser').css('top', '0px');
	// 	$('#laser').hide();
	// }

});

// TOAST

function toast(texto, cor = 'green', tempo = 2500) {

	// Simplesmente exibe um toast.

	$('.toast').css('background', cor);

	if (cor != 'green') {
		$('.toast').css('color', '#fff');
		$('.toast').css('text-shadow', '1px 1px 3px #606060');
	}

	$('.toast').fadeIn('300');
	$('.texto_toast').text(texto);

	setTimeout(function() {
		$('.toast').fadeOut('1000');
	}, tempo);
}

$('#numero_objetivo').text(aleatorio(1, 255));

$('#btn_jogar').click(function() {
	iniciou = true;
	$('#bg_iniciar_jogo').css('display', 'none');
	atualiza();
	temporizador();

});