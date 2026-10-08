import sqlite3,re,pathlib,json
root=pathlib.Path(__file__).resolve().parent.parent
conn=sqlite3.connect(':memory:');conn.executescript((root/'drizzle/0000_glorious_hex.sql').read_text())
source=(root/'lib/repository.ts').read_text()
invoice_sql=re.search(r'db.prepare\(`(INSERT INTO invoices.*?)`\)',source,re.S).group(1)
payment_sql=re.search(r'db.prepare\(`(INSERT INTO payments.*?)`\)',source,re.S).group(1)
def invoice(id,shop='luxora',kind='invoice'):
 conn.execute(invoice_sql,(id,shop,kind,'202610','LXR-202610-', '2026-10-08','','Customer','','[]',0,0,100000,'','2026-10-08T00:00:00Z','user','Admin',shop,'202610'))
# Legacy data exists before the new additive migration runs.
invoice('legacy')
conn.execute('INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?)',('old-pay','legacy','2026-10-08',50000,'Tunai','','2026-10-08T00:00:00Z','user','Admin'))
conn.executescript((root/'drizzle/0001_overrated_warstar.sql').read_text())
assert conn.execute('select state,version,total from invoices where id=?',('legacy',)).fetchone()==('active',1,100000)
assert conn.execute('select amount,kind from payments where id=?',('old-pay',)).fetchone()==(50000,'receipt')
def pay(id,inv,amount,kind='receipt'):
 return conn.execute(payment_sql,(id,'2026-10-08',amount,'Tunai','','2026-10-08T00:00:00Z','user','Admin',kind,inv,kind,amount,kind,amount)).rowcount
invoice('one');invoice('two');invoice('one')
assert conn.execute('select number from invoices order by seq').fetchall()==[('LXR-202610-0001',),('LXR-202610-0002',),('LXR-202610-0003',)]
assert pay('p1','one',60000)==1
assert pay('p1','one',60000)==0
assert pay('p2','one',50000)==0
assert pay('p3','one',40000)==1
assert pay('p4','one',1)==0
invoice('quote',kind='quotation');assert pay('p5','quote',100000)==0
assert conn.execute('select sum(amount) from payments where invoice_id=?',('one',)).fetchone()[0]==100000
assert conn.execute("select count(*) from audit_events where invoice_id='one' and action='created'").fetchone()[0]==1
assert conn.execute("select count(*) from audit_events where invoice_id='one' and action='payment'").fetchone()[0]==2
print('Storage: legacy data preserved, additive migration, numbering, retries, payment guards and audit triggers passed.')
