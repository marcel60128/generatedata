import * as React from 'react';
import Button from '@material-ui/core/Button';
import { SmallDialog, DialogTitle, DialogContent, DialogActions } from '../../../components/dialogs';
import styles from './Intro.scss';

export type IntroProps = {
	visible: boolean;
	onClose: any;
	i18n: any;
};

const IntroDialog = ({ visible, onClose }: IntroProps): JSX.Element => (
	<SmallDialog onClose={onClose} open={visible}>
		<DialogTitle onClose={onClose}>generatedata 4.0.0 demo</DialogTitle>
		<DialogContent dividers className={styles.contentPanel}>
			<img src="./images/dice180x180.png" width={90} height={90} />
			<div>
				<p>
					Welcome! This is <b>NOT</b> a working site yet: it's just a demo of the
					upcoming <a href="http://generatedata.com" target="_blank">generatedata.com</a> rewrite. So expect
					weird behaviour, browser crashes, horror and fury.
				</p>
				<p>
					You can follow the progress on <a href="https://github.com/benkeen/generatedata/issues" target="_blank">github</a>.
				</p>
			</div>
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose} color="primary" variant="outlined">
				Yeah, yeah.
			</Button>
		</DialogActions>
	</SmallDialog>
);

export default IntroDialog;
