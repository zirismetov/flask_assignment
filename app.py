import json
import time
from flask import Flask, render_template, redirect, url_for, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///HighScoreDatabase.sqlite?check_same_thread=False'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class ScoreRecords(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    player_name = db.Column(db.String(20), nullable= False)
    score = db.Column(db.Integer, nullable= False)
    date_created = db.Column(db.DateTime, nullable=True, default = datetime.utcnow)

    def __repr__(self):
        return '<ScoreRecords %r>' % self.id


@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'POST':
        data = request.get_json()
        try:
            add_data(data)
            rec = get_json_records()
            return rec
        except Exception as e:
            print('Data NOT insterted to DB! {}'.format(e))
    else:
        records = get_json_records().json
        return render_template('JS_7_basics_space_invaders_Zafarzhon_Irismetov.html', records = records )

def add_data(data):
    player_name = list(data)[0]
    score = data.get(player_name)
    json_records = get_json_records().json
    if check_data(name=player_name, score= score, data=json_records):
        record = ScoreRecords(player_name=player_name, score=score)
        db.session.add(record)
        db.session.commit()
        print('Data insterted to DB!')

def check_data(name, score , data):
    for i in data:
        if name == i[0]:
            record = ScoreRecords.query.filter_by(player_name=name).first()
            record.score = score
            db.session.commit()
            return False
    return True

def get_json_records():
    info = {}
    players = ScoreRecords.query.all()
    for i in range(len(players)):
        info[players[i].player_name] = players[i].score
    info = sorted(info.items(), key=lambda x: x[1], reverse=True)
    record = jsonify(info)
    return record

if __name__ == '__main__':
    app.run(debug=True)