const SCENE_WIDTH = 10;
const SCENE_HEIGHT = 15;

$(document).ready(function (){
    $.getJSON('/get_rec', function (records){
        JHIGH_SCORES = records
    })
});

class Element {
    #position = null;
    #char = 'generic';

    #element_id = 0;
    static #element_counter = 0;

    constructor(position, char = false) {
        this.#position = position;
        if(char) {
            this.#char = char;
        }

        Element.#element_counter ++;
        this.#element_id = Element.#element_counter;
    }

    set position(pos) {
        if (pos.get(0) < 0) { // pos.x < 0
            pos.set(0, 0);  // pos.x = 0
        }
        else if (pos.get(0) > SCENE_WIDTH) {
            pos.set(0, SCENE_WIDTH);
        }

        if (pos.get(1) < 0) {
            pos.set(1, 0);
        }
        else if (pos.get(1) > SCENE_HEIGHT-1) {
            pos.set(1, SCENE_HEIGHT-1);
        }

        this.#position = pos;
    }
    get position() {
        return this.#position;
    }

    draw() {
        let jScene = GameState.instance.jScene;
        let jElement = jScene.find(`#el-${this.#element_id}`); // <div id="el-1">
        if(jElement.length === 0) {
            jElement = $(`<div id="el-${this.#element_id}" class="element ${this.#char}" >`);
            jScene.append(jElement);
        }
        jElement.css({
            top: Math.floor(this.#position.get(1) * 20),
            left: Math.floor(this.#position.get(0) * 20),
        });
    }

    remove() {
        let jElement = GameState.instance.jScene.find(`#el-${this.#element_id}`);
        jElement.remove();
        GameState.instance.elements = _.pull(GameState.instance.elements, this);
    }

    update(delta_time) {

    }

    check_collision(other) {

        let is_collsion = false;
        if(other !== this) {
            const overlap = 0.5;
            let pos_floor = this.position.subtract(nj.array([overlap, overlap]));
            let pos_ceil = this.position.add(nj.array([overlap, overlap]));

            let other_round = other.position;

            if (pos_floor.get(0) < other_round.get(0) && other_round.get(0) < pos_ceil.get(0)) {
                if (pos_floor.get(1) < other_round.get(1) && other_round.get(1) < pos_ceil.get(1)) {
                    is_collsion = true;
                }
            }
        }

        return is_collsion;
    }
}

class Wall extends Element {
    constructor(position) {
        super(position, 'wall');
    }
}

class MovableElement extends Element {
    #direction = nj.array([0, 0]);
    #speed  = 1.0;

    constructor(position, char=false) {
        super(position, char);

        this.#direction = nj.array([0, 0]); // actually should use #direction
        this.#speed = 1.0;
    }

    update(delta_time) {
        super.update(delta_time);

        this.position = this.position.add(this.#direction.multiply(this.#speed * delta_time))
    }

    get speed() {
        return this.#speed;
    }

    set speed(value) {
        this.#speed = value;
    }

    get direction() {
        return this.#direction;
    }

    set direction(value) {
        this.#direction = value;
    }

    stop() {
        this.#direction = nj.array([0, 0]);
    }

    left() {
        this.#direction = nj.array([-1, 0]);
    }

    right() {
        this.#direction = nj.array([1, 0]);
    }

    up() {
        this.#direction = nj.array([0, -1]);
    }

    down() {
        this.#direction = nj.array([0, 1]);
    }
}

class Player extends MovableElement {
    #delay = 0.0;

    constructor(position) {
        super(position, 'player');
        this.speed = 1.5;
    }

    fire_rocket() {
        if(this.#delay <= 0) {
            let rocket = new Rocket(nj.round(this.position));
            rocket.position = rocket.position.subtract(nj.array([0, 1]));

            rocket.up();
            elements.push(rocket);
            this.#delay = 1.0;
        }
    }

    update(delta_time) {
        super.update(delta_time);
        this.#delay -= delta_time;
    }
}

const EVENT_ALIEN_FIRE_ROCKET = 'EVENT_ALIEN_FIRE_ROCKET';
const EVENT_ALIEN_CHANGE_DIRECTION = 'EVENT_ALIEN_CHANGE_DIRECTION';

class Alien extends MovableElement {
    #patience = 0;
    #shoot_intervals_sec = 3;

    constructor(position) {
        super(position, 'alien');

        this.speed = 0.5;

        this.reset_patience();
        window.addEventListener(EVENT_ALIEN_FIRE_ROCKET, this.reset_patience);
        window.addEventListener(EVENT_ALIEN_CHANGE_DIRECTION, this.change_direction)
    }

    reset_patience = (event) => {
        this.#patience = Math.random() + this.#shoot_intervals_sec;
    }

    change_direction = (event) => {
        this.direction = event.detail;
        this.position = nj.round(this.position);
        this.position = this.position.add(nj.array([0, 0.5]));
        this.reset_patience();

        //Increase difficulty
        this.#shoot_intervals_sec -= 0.5;
        this.#shoot_intervals_sec = Math.max(this.#shoot_intervals_sec, 1.0);
        this.speed = Math.min((this.speed + 0.1), 1.2);

    }

    fire_rocket = () => {
        let event = new Event(EVENT_ALIEN_FIRE_ROCKET);
        window.dispatchEvent(event);

        let pos = nj.round(this.position).add(nj.array([0, 1]));
        let rocket = new Rocket(pos, false)
        rocket.down();
        GameState.instance.elements.push(rocket);
    }

    update(delta_time) {
        super.update(delta_time);
        this.#patience -= delta_time;

        let is_lowest_row_of_aliens = true;
        for(let other_alien of GameState.instance.elements) {
            if(other_alien instanceof Alien) {
                if(other_alien !== this) {
                    if(other_alien.position.get(1) > this.position.get(1)) {
                        is_lowest_row_of_aliens = false;
                        break;
                    }
                }
            }
        }

        if(this.#patience < 0 && is_lowest_row_of_aliens) {
            this.fire_rocket();
            this.reset_patience();
        }
    }

    check_border() {
        let is_border = false;
        if(this.position.get(0) === 0 || this.position.get(0) === SCENE_WIDTH) {
            this.direction = this.direction.multiply(-1);

            let event = new CustomEvent(EVENT_ALIEN_CHANGE_DIRECTION, {
                detail: this.direction
            });
            window.dispatchEvent(event);

            is_border = true;
        }
        return is_border;
    }
}

class Rocket extends MovableElement {
    constructor(position, is_up=true) {
        let class_name = 'rocket-up';
        if(!is_up) {
            class_name = 'rocket-down';
        }
        super(position, class_name);

        this.speed = 2.0;
    }

    update(delta_time) {
        super.update(delta_time);
        if(this.position.get(1) <= 0 || this.position.get(1) >= SCENE_HEIGHT - 1) {
            this.remove();
        }
    }
}

class Explosion extends Element {
    #life = 0.5;

    constructor(position) {
        super(position, 'explosion');
    }

    update(delta_time) {
        super.update(delta_time);
        this.#life -= delta_time;
        if(this.#life <= 0) {
            this.remove();
        }
    }
}

class GameState {
    static #instance = null;

    constructor() {
        if(GameState.#instance) {
            throw new Error('Singleton cannot be initialized twice');
        }
        this.jScene = $('#scene'); // CSS selector
        this.elements = [];
        this.player = null;
        this.is_game_running = true;
        this.score = 5;
        this.lives = 1;
    }

    static get instance() {
        if(GameState.#instance === null) {
            GameState.#instance = new GameState();
        }
        return GameState.#instance;
    }
}


GameState.instance.player = new Player(nj.array([parseInt(SCENE_WIDTH/2), SCENE_HEIGHT-1]));
let elements = [GameState.instance.player];

for(let i = 0; i < 4; i++) {
    let wall_pos = nj.array([2 + i * 2, SCENE_HEIGHT-4]);
    let wall = new Wall(wall_pos);
    elements.push(wall);
}

for(let i = 0; i < 5; i++) {
    for(let j = 0; j < 2; j++) {
        let alien_pos = nj.array([2 + i, j]);
        let alien = new Alien(alien_pos);
        elements.push(alien);
    }
}
GameState.instance.elements = elements;

let last_alien = elements[elements.length-1];
if(Math.random() > 0.5) {
    last_alien.right();
}
else {
    last_alien.left();
}
let event = new CustomEvent(EVENT_ALIEN_CHANGE_DIRECTION, {
    detail: last_alien.direction
})
window.dispatchEvent(event);


function get_time_sec() {
    let result = Date.now() / 1000.0;
    return result;
}

function contains_type(el1, el2, el_type) {
    let result = false;

    if(el1 instanceof el_type)
    {
        result = true;
    }
    else if(el2 instanceof el_type)
    {
        result = true;
    }

    return result;
}

let jScore = $('.span_score');
let jLives = $('#header_lives');

function main_game_loop() {

    jScore.html(GameState.instance.score.toString());

    let strLives = '';
    for(let i = 0; i < GameState.instance.lives; i++) {
        strLives += '📤';
    }
    jLives.html(strLives);

    let time_now = get_time_sec();
    let elements = GameState.instance.elements;

    let time_delta = time_now - time_before;
    for(let element of elements) {
        element.update(time_delta)
    }

    let is_all_aliens_dead = true;
    for(let element of elements) {
        if(element instanceof Alien) {
            is_all_aliens_dead = false;
            if(element.check_border()) {
                break;
            }
        }
    }

    if(is_all_aliens_dead) {
        GameState.instance.is_game_running = false;
        show_overlay();

    }

    let is_collision = false;
    for(let i = 0; i < elements.length; i++) {
        for(let j = i+1; j < elements.length; j++) {
            let el_i = elements[i];
            let el_j = elements[j];

            if(el_i.check_collision(el_j)) {
                is_collision = true;
            }
            if(is_collision) {


                if(el_i instanceof Rocket && el_j instanceof Rocket)
                {
                    //Rockets can fly by each other
                    is_collision = false;
                }
                else if(contains_type(el_j, el_i, Rocket) && contains_type(el_j, el_i, Alien)) {
                    GameState.instance.score += 1;
                }
                else if(contains_type(el_j, el_i, Player)) {
                    GameState.instance.lives -= 1;
                    if(GameState.instance.lives === 0) {
                        GameState.instance.is_game_running = false;
                        show_overlay();
                    } else {
                        if(el_i instanceof Rocket)
                        {
                            el_i.remove();
                        }
                        else if(el_j instanceof Rocket)
                        {
                            el_j.remove();
                        }
                        is_collision = false;
                    }
                }
                else {
                    GameState.instance.score -= 1;
                    GameState.instance.score = Math.max(GameState.instance.score, 0);
                }

                if(is_collision) {
                    elements.push(new Explosion(nj.round(el_i.position)))
                    el_i.remove();
                    el_j.remove();
                }

                break;
            }
        }
        if(is_collision) {
            break;
        }
    }

    for(let element of elements) {
        element.draw();
    }

    time_before = time_now;
    if(GameState.instance.is_game_running) {
        setTimeout(main_game_loop, 100);
    }else{
        show_overlay();
    }
}
let time_before = get_time_sec();
setTimeout(main_game_loop, 100);

$(document).bind('keydown', ( event ) => {
    let player = GameState.instance.player;
    if (event.key === 'ArrowLeft') {
        player.left();
    }
    else if (event.key === 'ArrowRight') {
        player.right();
    }
    else if (event.key === ' ') {
        player.fire_rocket();
    }
    else if(event.key === 'Escape') {
        GameState.instance.is_game_running = false;
        show_overlay();
    }
    if (GameState.instance.is_game_running){
        event.preventDefault();
    }
});

function show_overlay(){
    $(`#header_lives`).css('display', 'none');
    $(`#header_score`).css('display', 'none');
    $(`#top_scores_div`).css('display', 'none');
    $(`#button_restart`).css('display', 'block');
    $(`#overlay`).css('display', 'block');

    if (JHIGH_SCORES.length === 0){
        $(`#submit`).css('display', 'block');
    }else {
        if(!check_high_score(JHIGH_SCORES)){
            show_top_ten(JHIGH_SCORES);
        }
    }
}
function check_high_score(scores) {
    for (let i = 0; i< scores.length; i++) {
        if (i < 10) {
            if (parseInt(GameState.instance.score) > parseInt(scores[i][1]) ||
                scores.length < 10) {
                $(`#top_scores_div`).css('display', 'none');
                $(`#submit`).css('display', 'block');
                return true;
            }
        }
    }
    return false;
    }

function show_top_ten(record) {
    for (let i = 0; i < record.length; i++) {
        if (i < 10){
        player_name = record[i][0]
        player_score = record[i][1]
        let html = '<li><span>' + player_name + ": " + player_score + '</span></li>';
        $('#top_list').append(html);
        }else {
            break;
        }
    }
    $(`#top_scores_div`).css('display', 'block');
}




$(`#button_restart`).click(function (){location.reload()})

$(`#overlay > form:first`).submit((event) =>{
    event.preventDefault();
    let json_high_scores = {}
    let jPlayer_name = $('#submit input[name="player_name"]');
    let str_player_name = jPlayer_name.val().trim();
    json_high_scores[str_player_name] = GameState.instance.score;

    req = $.ajax({
          type: "POST",
          contentType: "application/json; charset=utf-8",
          url: "/",
          data: JSON.stringify(json_high_scores),
          dataType: "json"
        });

    req.done(function (record){
        $(`#submit`).css('display', 'none');
        show_top_ten(record);
    })

})
