import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn();
  Object.defineProperty(global.navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(),
    },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('requires login before showing checkout', async () => {
  render(<App />);

  expect(screen.getByText(/burger house/i)).toBeInTheDocument();
  expect(screen.getByText(/login required/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /place order/i })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Kamlesh' } });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'kamlesh@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret1' } });
  fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

  const placeOrderButton = await screen.findByRole('button', { name: /place order/i });
  expect(placeOrderButton).toBeInTheDocument();
  expect(screen.getByText(/hi, kamlesh/i)).toBeInTheDocument();

  fireEvent.click(placeOrderButton);

  expect(screen.getByRole('button', { name: /delivery details opened/i })).toBeInTheDocument();
  expect(screen.getByText(/add your delivery details below/i)).toBeInTheDocument();
  expect(screen.getByText(/where should we bring it/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /use my location/i })).toBeInTheDocument();

  global.fetch.mockResolvedValueOnce({
    json: async () => ({
      display_name: 'MVC3+P9Q, Moshi, Pune - Nashik Hwy, Laxmi Nagar, Pimpri-Chinchwad',
    }),
  });
  navigator.geolocation.getCurrentPosition.mockImplementationOnce((success) =>
    success({ coords: { latitude: 18.67321, longitude: 73.84925 } })
  );

  fireEvent.click(screen.getByRole('button', { name: /use my location/i }));

  expect(
    await screen.findByText(/MVC3\+P9Q, Moshi, Pune - Nashik Hwy/i)
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/street address/i)).toHaveValue(
    'MVC3+P9Q, Moshi, Pune - Nashik Hwy, Laxmi Nagar, Pimpri-Chinchwad'
  );

  fireEvent.click(screen.getByRole('button', { name: /review address/i }));
  expect(screen.getByText(/please complete street address/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/street address/i), {
    target: { value: '221 Burger Street' },
  });
  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Pune' } });
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } });
  fireEvent.click(screen.getByRole('button', { name: /review address/i }));

  expect(screen.getByText(/recheck delivery details/i)).toBeInTheDocument();
  expect(screen.getByText(/221 burger street/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /confirm order/i }));
  expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
  expect(screen.getByText(/you will get your burger soon/i)).toBeInTheDocument();
});
