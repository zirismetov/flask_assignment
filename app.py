from flask import Flask, render_template, request, jsonify
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


#Cotroller
@app.route('/', methods = ['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            data = request.get_json()
            if data_not_exist(data):
                add_data(data)
            rec = get_records()
            jrec = get_json_view(rec)
            return jrec
        except Exception as e:
            print('Data NOT insterted to DB! {}'.format(e))
    else:
        return render_template('JS_7_basics_space_invaders_Zafarzhon_Irismetov.html')

@app.route('/get_rec', methods=['GET'])
def get_rec():
    rec = get_records()
    jrec = get_json_view(rec)
    return jrec


#Model
def add_data(data):
    player_name = list(data)[0]
    score = data.get(player_name)
    record = ScoreRecords(player_name=player_name, score=score)
    db.session.add(record)
    db.session.commit()
    print('Data insterted to DB!')

def data_not_exist(data):
    name = list(data)[0]
    score = data.get(name)
    all_records = get_records()
    for i in all_records:
        if name == i.player_name:
            if i.score < score:
                i.score = score
                db.session.commit()
                print('Data updated to DB!')
                return False
            else:
                print('This name already has better or same score')
                return False
    return True

def get_records():
    return ScoreRecords.query.order_by(ScoreRecords.score.desc()).limit(15).all()


#View
def get_json_view(records):
    info = {}
    for i in range(len(records)):
        info[records[i].player_name] = records[i].score
    info = sorted(info.items(), key=lambda x: x[1], reverse=True)
    record = jsonify(info)
    return record



if __name__ == '__main__':
    app.run(debug=True)